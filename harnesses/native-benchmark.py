"""Measure completed inproc REQ/REP exchanges, after setup, in one process."""
import argparse,json,statistics,time
import zmq

def run(count=1000,trials=5):
    if not 1<=count<=100000 or not 1<=trials<=20:raise ValueError('count 1..100000; trials 1..20')
    samples=[]
    for trial in range(trials):
        with zmq.Context() as context:
            server=context.socket(zmq.REP);client=context.socket(zmq.REQ)
            server.linger=client.linger=0;server.rcvtimeo=client.rcvtimeo=5000
            server.bind('inproc://bench');client.connect('inproc://bench')
            start=time.perf_counter();completed=0
            for i in range(count):
                payload=i.to_bytes(8,'little');client.send(payload);request=server.recv();server.send(request);reply=client.recv()
                if reply!=payload:raise AssertionError('Incorrect reply')
                completed+=1
            elapsed=time.perf_counter()-start;server.close();client.close()
        samples.append({'completed':completed,'seconds':elapsed,'exchanges_per_second':completed/elapsed})
    return {'transport':'inproc','processes':1,'payload_bytes':8,'includes':'Four send/receive calls per exchange and reply validation; excludes context/socket setup','pyzmq':zmq.pyzmq_version(),'libzmq':zmq.zmq_version(),'median_seconds':statistics.median(s['seconds'] for s in samples),'trials':samples}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--count',type=int,default=1000);parser.add_argument('--trials',type=int,default=5);args=parser.parse_args();print(json.dumps(run(args.count,args.trials),indent=2))
