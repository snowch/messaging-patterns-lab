import sys,json,subprocess,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'python'))
from messaging import *
lessons=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {lessons} from './src/lessons.mjs'; console.log(JSON.stringify(lessons))"],cwd=ROOT))
results=[];by={}
for lesson in lessons:
 ns={};exec(lesson['code'],ns);results.append(ns['result']);by[lesson['slug']]=ns['result']
assert by['request-and-reply']['reply']==['ACK','hello'] and round_trip('order-42')['reply']==['ACK','order-42']
assert multipart()['frames']==['6f7264657273','00ff',''] and multipart(False)['payload_bytes']==8
assert 'EFSM' in request_state()['second_send']
assert pipeline(3)['total']==5
assert subscriptions('orders')['received']==[['orders','a']] and len(subscriptions('')['received'])==3
assert slow_joiner()['received']==['price','new']
assert sequence_gap()['missing_sequences']==[3] and sequence_gap(None)['missing_sequences']==[]
assert nonblocking()['empty_receive_would_block']
for hwm in [1,2,4]:
 r=high_water(hwm);assert r['drained']==list(range(r['accepted_before_again'])) and 0<r['accepted_before_again']<100
assert routing()=={'alpha':['ACK','job','alpha'],'beta':['ACK','job','beta']}
assert mandatory()['outcome']=='EHOSTUNREACH' and 'accepted' in mandatory(False)['outcome']
assert correlation()['reply_arrival_order']==['c','b','a'] and correlation()['matched']=={'a':'A','b':'B','c':'C'}
assert proxy_exchange()['reply']==['done','job-1','12']
assert retries()['total_effect']==12 and retries(False)['total_effect']==24
assert [row['worker'] for row in credits()['assignments']]==['w1','w2','w1','w2']
assert last_value()['received']==['12','15'] and last_value(False)['received']==['15']
assert monitor()['handshake_succeeded'] and curve()['reply']=='ACK'
assert not immediate()['send_accepted'] and immediate(False)['send_accepted']
assert capstone()['effect_total']==12 and capstone(False)['effect_total']==24
spec=importlib.util.spec_from_file_location('benchmark',ROOT/'harnesses/native-benchmark.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);assert module.run(10,1)['trials'][0]['completed']==10
print(json.dumps(results) if '--json' in sys.argv else 'PASS 20 exact examples, independent boundaries/variants, native benchmark correctness.')
