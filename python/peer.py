"""Separate-process endpoints used by the TCP and proxy investigations."""
import json,sys
import zmq
context=zmq.Context()
if sys.argv[1]=='rep':
    endpoint=context.socket(zmq.REP);endpoint.linger=0
    port=endpoint.bind_to_random_port('tcp://127.0.0.1')
    print(json.dumps({'port':port}),flush=True)
    request=endpoint.recv_multipart();endpoint.send_multipart([b'ACK',*request])
    if endpoint.recv()!=b'BYE':raise RuntimeError('Expected closing handshake')
    endpoint.linger=1000;endpoint.send(b'closed');endpoint.close();context.term()
elif sys.argv[1]=='proxy':
    front=context.socket(zmq.ROUTER);back=context.socket(zmq.DEALER)
    front.linger=back.linger=0
    a=front.bind_to_random_port('tcp://127.0.0.1');b=back.bind_to_random_port('tcp://127.0.0.1')
    print(json.dumps({'front':a,'back':b}),flush=True)
    zmq.proxy(front,back)
