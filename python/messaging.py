"""Bounded real-ZeroMQ investigations. Application policies are explicitly authored."""
from contextlib import contextmanager
from pathlib import Path
import json,os,subprocess,sys,time,tempfile
import zmq

@contextmanager
def lab():
    context=zmq.Context()
    sockets=[]
    def socket(kind,**options):
        value=context.socket(kind);value.linger=0;value.rcvtimeo=5000;value.sndtimeo=5000
        for name,setting in options.items():setattr(value,name,setting)
        sockets.append(value);return value
    try:yield socket
    finally:
        for value in sockets:value.close(0)
        context.term()

@contextmanager
def peer(mode):
    executable=os.environ.get('LAB_PYTHON',sys.executable)
    process=subprocess.Popen([executable,str(Path(__file__).with_name('peer.py')),mode],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        ready=process.stdout.readline()
        if not ready:raise RuntimeError('Peer failed: '+process.stderr.read())
        yield json.loads(ready),process
    finally:
        if process.poll() is None:process.terminate()
        try:process.wait(timeout=5)
        except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)

def round_trip(value='hello'):
    with peer('rep') as (ready,process),lab() as socket:
        client=socket(zmq.REQ);client.connect(f"tcp://127.0.0.1:{ready['port']}")
        client.send_string(value);reply=client.recv_multipart()
        client.send(b'BYE')
        if client.recv()!=b'closed':raise RuntimeError('Closing handshake failed')
        process.wait(timeout=5)
        return {'request':value,'reply':[frame.decode() for frame in reply],'separate_process':True,'transport':'TCP loopback'}

def multipart(extra_empty=True):
    with tempfile.TemporaryDirectory(prefix='mpl-frames-') as directory,lab() as socket:
        endpoint='ipc://'+directory+'/socket'
        a=socket(zmq.PAIR);b=socket(zmq.PAIR);a.bind(endpoint);b.connect(endpoint)
        frames=[b'orders',b'\x00\xff',b''] if extra_empty else [b'orders',b'\x00\xff']
        a.send_multipart(frames);received=b.recv_multipart()
        return {'frames':[v.hex() for v in received],'frame_count':len(received),'payload_bytes':sum(map(len,received))}

def request_state():
    with lab() as socket:
        server=socket(zmq.REP);client=socket(zmq.REQ);server.bind('inproc://state');client.connect('inproc://state')
        client.send(b'first');server.recv()
        try:client.send(b'second',zmq.DONTWAIT);state='unexpected acceptance'
        except zmq.ZMQError as e:
            if e.errno!=zmq.EFSM:raise
            state='EFSM: receive required before another send'
        server.send(b'ACK');reply=client.recv().decode()
        client.send(b'second');server.recv();server.send(b'ACK');client.recv()
        return {'second_send':state,'first_reply':reply,'successful_exchanges':2}

def pipeline(count=6):
    if not 1<=count<=32:raise ValueError('count must be 1..32')
    with lab() as socket:
        sink=socket(zmq.PULL);source=socket(zmq.PUSH);sink.bind('inproc://jobs');source.connect('inproc://jobs')
        for i in range(count):source.send_json({'job':i,'value':i*i})
        rows=[sink.recv_json() for _ in range(count)]
        return {'jobs':[r['job'] for r in rows],'total':sum(r['value'] for r in rows),'application_acknowledgements':0}

def publisher(socket,topic=b'price'):
    pub=socket(zmq.XPUB);sub=socket(zmq.SUB);pub.bind('inproc://updates')
    sub.setsockopt(zmq.SUBSCRIBE,topic);sub.connect('inproc://updates')
    control=pub.recv()
    if control!=b'\x01'+topic:raise RuntimeError('Unexpected subscription control')
    return pub,sub

def subscriptions(prefix='price'):
    with lab() as socket:
        pub,sub=publisher(socket,prefix.encode())
        rows=[['prices','12'],['pricey','99'],['orders','a']]
        for topic,value in rows:pub.send_multipart([topic.encode(),value.encode()])
        expected=[row for row in rows if row[0].startswith(prefix)]
        received=[[f.decode() for f in sub.recv_multipart()] for _ in expected]
        return {'prefix':prefix,'received':received,'subscription_seen_by_publisher':True}

def slow_joiner():
    with lab() as socket:
        pub=socket(zmq.XPUB);pub.bind('inproc://early');pub.send_multipart([b'price',b'old'])
        sub=socket(zmq.SUB);sub.subscribe=b'price';sub.connect('inproc://early');pub.recv()
        pub.send_multipart([b'price',b'new']);seen=[f.decode() for f in sub.recv_multipart()]
        return {'published':['old','new'],'received':seen,'unconnected_publish_was_not_replayed':True}

def sequence_gap(skip=3):
    with lab() as socket:
        pub,sub=publisher(socket)
        values=[i for i in range(1,5) if i!=skip]
        for value in values:pub.send_multipart([b'price',str(value).encode()])
        seen=[int(sub.recv_multipart()[1]) for _ in values];expected=1;gaps=[]
        for value in seen:gaps.extend(range(expected,value));expected=value+1
        return {'received_sequences':seen,'missing_sequences':gaps,'policy':'Publisher intentionally omits a sequence; the detector does not diagnose network loss.'}

def nonblocking():
    with lab() as socket:
        sink=socket(zmq.PULL);source=socket(zmq.PUSH);sink.bind('inproc://empty');source.connect('inproc://empty')
        try:sink.recv(zmq.DONTWAIT);empty=False
        except zmq.Again:empty=True
        source.send(b'work');value=sink.recv().decode()
        return {'empty_receive_would_block':empty,'later_message':value}

def high_water(hwm=2):
    if not 1<=hwm<=8:raise ValueError('hwm must be 1..8')
    with lab() as socket:
        sink=socket(zmq.PULL,rcvhwm=hwm);source=socket(zmq.PUSH,sndhwm=hwm)
        sink.bind('inproc://capacity');source.connect('inproc://capacity');sent=0
        for i in range(100):
            try:source.send_string(str(i),zmq.DONTWAIT);sent+=1
            except zmq.Again:break
        else:raise RuntimeError('Expected bounded inproc queue')
        received=[int(sink.recv()) for _ in range(sent)]
        return {'hwm_each':hwm,'accepted_before_again':sent,'drained':received,'boundary':'Actual inproc PUSH/PULL queue in this pinned libzmq; this is not a TCP byte or RSS limit.'}

def routing():
    with lab() as socket:
        router=socket(zmq.ROUTER);router.bind('inproc://routes');clients={}
        for identity in ['alpha','beta']:
            client=socket(zmq.DEALER);client.identity=identity.encode();client.connect('inproc://routes');clients[identity]=client
            client.send_multipart([b'job',identity.encode()]);frames=router.recv_multipart()
            router.send_multipart([frames[0],b'ACK',*frames[1:]])
        return {key:[v.decode() for v in client.recv_multipart()] for key,client in clients.items()}

def mandatory(enabled=True):
    with lab() as socket:
        router=socket(zmq.ROUTER);router.router_mandatory=int(enabled);router.bind('inproc://missing')
        try:router.send_multipart([b'unknown',b'payload'],zmq.DONTWAIT);outcome='send accepted without delivery evidence'
        except zmq.ZMQError as e:
            if e.errno!=zmq.EHOSTUNREACH:raise
            outcome='EHOSTUNREACH'
        return {'mandatory':enabled,'outcome':outcome}

def correlation():
    with lab() as socket:
        router=socket(zmq.ROUTER);client=socket(zmq.DEALER);router.bind('inproc://ids');client.connect('inproc://ids')
        for identity in ['a','b','c']:client.send_multipart([identity.encode(),identity.upper().encode()])
        requests=[router.recv_multipart() for _ in range(3)]
        for identity,request,value in reversed(requests):router.send_multipart([identity,request,value])
        replies=[client.recv_multipart() for _ in range(3)]
        return {'reply_arrival_order':[row[0].decode() for row in replies],'matched':dict(sorted((key.decode(),value.decode()) for key,value in replies))}

def proxy_exchange():
    with peer('proxy') as (ready,process),lab() as socket:
        client=socket(zmq.REQ);worker=socket(zmq.REP)
        client.connect(f"tcp://127.0.0.1:{ready['front']}");worker.connect(f"tcp://127.0.0.1:{ready['back']}")
        client.send_multipart([b'job-1',b'12']);job=worker.recv_multipart();worker.send_multipart([b'done',*job]);reply=client.recv_multipart()
        return {'reply':[v.decode() for v in reply],'proxy_separate_process':True,'mechanism':'Actual zmq.proxy with ROUTER frontend and DEALER backend'}

def retries(deduplicate=True):
    with lab() as socket:
        router=socket(zmq.ROUTER);router.bind('inproc://retry');seen=set();effects=[];attempts=[]
        for attempt in range(2):
            client=socket(zmq.REQ);client.connect('inproc://retry');client.send_json({'id':'charge-a','amount':12})
            address,delimiter,payload=router.recv_multipart();event=json.loads(payload)
            if not deduplicate or event['id'] not in seen:effects.append(event['amount']);seen.add(event['id'])
            if attempt==0:
                # Deliberately drop the first acknowledgement after applying work.
                available=bool(client.poll(10,zmq.POLLIN));client.close(0)
                attempts.append({'attempt':1,'reply_available':available,'client_socket':'discarded'})
            else:
                router.send_multipart([address,delimiter,b'ACK charge-a']);reply=client.recv().decode()
                attempts.append({'attempt':2,'reply_available':True,'client_socket':'new REQ'})
        return {'logical_id':'charge-a','attempts':attempts,'effects':effects,'total_effect':sum(effects),'reply':reply,'dedup_store':'Volatile authored set; not a transactional payment service.'}

def credits():
    with lab() as socket:
        broker=socket(zmq.ROUTER);broker.bind('inproc://credit');workers={}
        for identity in ['w1','w2']:
            worker=socket(zmq.DEALER);worker.identity=identity.encode();worker.connect('inproc://credit');worker.send(b'READY');workers[identity]=worker
        ready=sorted(broker.recv_multipart()[0].decode() for _ in workers)
        assignments=[]
        for job in range(4):
            identity=ready.pop(0);broker.send_multipart([identity.encode(),str(job).encode()]);value=workers[identity].recv().decode()
            workers[identity].send_multipart([b'DONE',value.encode()]);reply=broker.recv_multipart();ready.append(reply[0].decode())
            assignments.append({'job':int(value),'worker':identity})
        return {'assignments':assignments,'credits_remaining':len(ready),'policy':'Authored one-credit dispatch; workers share a process and no parallel service-time claim is made.'}

def last_value(replay=True):
    with lab() as socket:
        pub=socket(zmq.XPUB);pub.bind('inproc://cache');cache={b'price':b'12'}
        sub=socket(zmq.SUB);sub.subscribe=b'price';sub.connect('inproc://cache');pub.recv()
        if replay:pub.send_multipart([b'price',cache[b'price']])
        pub.send_multipart([b'price',b'15'])
        rows=[sub.recv_multipart()[1].decode() for _ in range(2 if replay else 1)]
        return {'received':rows,'cache_replay':replay,'mechanism':'Authored latest-value dictionary and XPUB subscription control; not built-in durable history.'}

def monitor():
    from zmq.utils.monitor import recv_monitor_message
    with lab() as socket:
        server=socket(zmq.REP);port=server.bind_to_random_port('tcp://127.0.0.1')
        client=socket(zmq.REQ);events=client.get_monitor_socket();events.rcvtimeo=5000;events.linger=0
        try:
            client.connect(f'tcp://127.0.0.1:{port}');client.send(b'ping');server.recv();server.send(b'pong');client.recv()
            observed=set()
            while zmq.EVENT_HANDSHAKE_SUCCEEDED not in observed:observed.add(recv_monitor_message(events)['event'])
            return {'connected':zmq.EVENT_CONNECTED in observed,'handshake_succeeded':True,'application_reply':'pong','boundary':'Transport events and one completed application exchange; not ongoing service health.'}
        finally:client.disable_monitor();events.close(0)

def immediate(enabled=True):
    with lab() as socket:
        source=socket(zmq.PUSH,immediate=int(enabled));source.connect('tcp://127.0.0.1:1')
        try:source.send(b'work',zmq.DONTWAIT);accepted=True
        except zmq.Again:accepted=False
        return {'immediate':enabled,'send_accepted':accepted,'application_acknowledgement':False,'close_policy':'LINGER=0; pending work is discarded when this socket closes.'}

def curve():
    if not zmq.has('curve'):raise RuntimeError('This build lacks CURVE')
    public,private=zmq.curve_keypair();client_public,client_private=zmq.curve_keypair()
    with lab() as socket:
        server=socket(zmq.REP);server.curve_publickey=public;server.curve_secretkey=private;server.curve_server=True
        port=server.bind_to_random_port('tcp://127.0.0.1')
        client=socket(zmq.REQ);client.curve_publickey=client_public;client.curve_secretkey=client_private;client.curve_serverkey=public
        client.connect(f'tcp://127.0.0.1:{port}');client.send(b'private request');server.recv();server.send(b'ACK');reply=client.recv().decode()
        return {'curve_supported':True,'reply':reply,'server_key_pinned':True,'client_authorization':'No ZAP allowlist is configured; possession of a fresh client key does not establish application permission.'}

def capstone(deduplicate=True):
    retry=retries(deduplicate)
    matched=correlation()
    return {'effect_total':retry['total_effect'],'request_attempts':len(retry['attempts']),'logical_requests':1,'matched_replies':matched['matched'],'diagnosis':'The first ACK is deliberately lost after applying work. Stable identity and an authored duplicate policy affect the visible effect; transport success alone does not.'}
