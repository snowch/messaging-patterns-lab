import sys,json,subprocess,importlib.util,re
from pathlib import Path
from html import unescape
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'python'))
from messaging import *
lessons=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {lessons} from './src/lessons.mjs'; console.log(JSON.stringify(lessons))"],cwd=ROOT))
results=[];by={};variants={}
for lesson in lessons:
 ns={};exec(lesson['code'],ns);results.append(ns['result']);by[lesson['slug']]=ns['result']
 edits=['result = '+lesson['changeCall']] if 'changeCall' in lesson else re.findall(r'<code>(result = [^<]+)</code>',lesson['change'])
 if not lesson.get('inspectOnly'):
  assert edits, f"Missing runnable edit in {lesson['slug']}"
  variants[lesson['slug']]=[]
  for edit in edits:
   source=lesson['code'].rsplit('\n',1)[0]+'\n'+unescape(edit)
   ns={};exec(source,ns)
   variants[lesson['slug']].append({'edit':unescape(edit),'result':ns['result']})
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
def observed(slug,index=0):
 return variants[slug][index]['result']
state=observed('respect-the-req-state-machine')
assert state['second_send']=='Accepted after receiving the first reply' and state['successful_exchanges']==2
assert observed('meet-the-late-subscriber')['received']==['price','old','new']
assert observed('receive-without-blocking')=={'empty_receive_would_block':True,'later_message':''}
assert observed('route-an-envelope')=={'desk-a':['ACK','job','alpha'],'beta':['ACK','job','beta']}
out_of_order=observed('match-out-of-order-replies')
assert out_of_order['reply_arrival_order']==['a','b','c'] and out_of_order['matched']==correlation()['matched']
assert observed('forward-through-a-proxy')['reply']==['done','job-2','12']
no_credit=observed('dispatch-with-worker-credit')
assert [row['worker'] for row in no_credit['assignments']]==['w1','w2']
assert no_credit['blocked_job']==2 and no_credit['credits_remaining']==0
assert observed('request-and-reply')['reply']==['ACK','order-42']
assert observed('preserve-message-frames')['frame_count']==2 and observed('preserve-message-frames')['payload_bytes']==8
assert observed('send-work-down-a-pipeline')['jobs']==[0,1,2] and observed('send-work-down-a-pipeline')['total']==5
assert observed('filter-a-publication')['received']==[['orders','a']]
assert len(observed('filter-a-publication',1)['received'])==3
assert observed('detect-a-sequence-gap')['missing_sequences']==[]
assert observed('detect-a-sequence-gap',1)['missing_sequences']==[2]
assert [observed('bound-a-socket-queue',i)['hwm_each'] for i in range(2)]==[1,4]
for i in range(2):
 value=observed('bound-a-socket-queue',i)
 assert value['drained']==list(range(value['accepted_before_again']))
assert 'accepted' in observed('reject-an-unknown-route')['outcome']
assert observed('retry-with-stable-identity')['effects']==[12,12]
assert observed('replay-a-cached-value')['received']==['15']
assert observed('choose-connect-and-close-policy')['send_accepted']
assert observed('diagnose-the-missing-receipt')['effect_total']==24
spec=importlib.util.spec_from_file_location('benchmark',ROOT/'harnesses/native-benchmark.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);assert module.run(10,1)['trials'][0]['completed']==10
if '--browser-samples' in sys.argv:print(json.dumps({'samples':results,'variants':variants}))
elif '--json' in sys.argv:print(json.dumps(results))
else:print(f'PASS {len(results)} exact examples, {sum(map(len,variants.values()))} exact follow-up edits, and native benchmark correctness.')
