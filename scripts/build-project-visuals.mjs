import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseSchema} from './schema-parser.mjs';
import {commercialColumnNames} from './commercial-column-names.mjs';
const file='portfolio_codex_bundle/portfolio-data.json',data=JSON.parse(readFileSync(file,'utf8'));
const evidence=id=>data.dimensions.evidence.find(e=>e.id===id);
const project=id=>data.dimensions.projects.find(p=>p.id===id);
function source(repo,revision,path){const bytes=execFileSync('git',['-C',repo,'show',`${revision}:${path}`]);return {sql:bytes.toString('utf8'),sha256:createHash('sha256').update(bytes).digest('hex')};}
const commercial=evidence('E004').artifact.source,rental=evidence('E029').source;
const c=source('sources.local/Franchise_Recommendation_DB',commercial.revision,commercial.path);
const r=source('sources.local/RentalTrack',rental.revision,rental.path);
const r12path='backend/src/main/resources/db/migration/V12__add_legacy_import_tracking.sql';
const r12=source('sources.local/RentalTrack',rental.revision,r12path);
assert.equal(c.sha256,commercial.sourceSha256);assert.equal(r.sha256,rental.sourceSha256);
const ct=parseSchema(c.sql),rt=parseSchema(r.sql+'\n'+r12.sql);
assert.equal(ct.length,7);assert.equal(rt.length,17);
ct.forEach(table=>table.columns.forEach(column=>{assert.ok(commercialColumnNames[column.name],`English name missing: ${table.name}.${column.name}`);column.displayName=commercialColumnNames[column.name];}));
const labels={common_code_group:'공통 코드 그룹',common_code:'공통 코드',member:'회원',business:'사업자',rental_item:'대여 상품',rental_contract:'대여 계약',condition_record:'상태 기록',condition_photo:'상태 사진',damage_observation:'손상 관찰',damage_photo:'손상·사진 연결',image_analysis_result:'분석 후보 저장',return_inspection:'반납 검수',damage_assessment:'손상 판정',member_credential:'회원 인증',legacy_import_mutex:'이전 직렬화',legacy_import_run:'이전 실행',legacy_entity_map:'이전 ID 대응표'};
rt.forEach(table=>table.label=labels[table.name]);
project('P001').visualization={kind:'erd',title:'업종과 상권을 연결하는 데이터 모델',summary:'공통 코드 기준 테이블 분리\n상권·업종 복합키로 집계 단위 고정\n프랜차이즈 업종에서 상권 매출로 연결',sources:[{url:evidence('E004').url,sha256:c.sha256}],tables:ct,views:[{id:'all',label:'전체 7개 테이블',lanes:[['상권_구분','자치구','행정동'],['상권정보','점포'],['서비스_업종','프랜차이즈']],focus:'점포'}]};
project('P004').visualization={kind:'erd',title:'계약을 중심으로 연결한 대여 이력',summary:'상품과 계약을 분리한 반복 대여 모델\n계약·단계·차수의 복합 UNIQUE\n인수·반납 기록을 참조하는 검수와 손상 판정',sources:[{url:evidence('E029').url,sha256:r.sha256},{url:`${rental.repositoryUrl}/blob/${rental.revision}/${r12path}`,sha256:r12.sha256}],tables:rt,views:[
 {id:'rental',label:'대여·상태 기록',lanes:[['business','member'],['rental_item','rental_contract'],['condition_record']],focus:'condition_record'},
 {id:'inspection',label:'반납·검수',lanes:[['rental_contract','condition_record'],['return_inspection','damage_observation'],['damage_assessment']],focus:'return_inspection'},
 {id:'photos',label:'사진·손상',lanes:[['condition_record'],['condition_photo','damage_observation'],['damage_photo','image_analysis_result']],focus:'damage_photo'},
 {id:'codes',label:'공통 코드·인증',lanes:[['common_code_group','member'],['common_code','member_credential']],focus:'common_code'},
 {id:'import',label:'이력 이전',lanes:[['member','legacy_import_mutex'],['legacy_import_run'],['legacy_entity_map']],focus:'legacy_entity_map'},
 {id:'all',label:'업무·확장 전체',lanes:[['business','member','common_code_group','legacy_import_mutex'],['rental_item','rental_contract','common_code','member_credential'],['condition_record','return_inspection','legacy_import_run'],['condition_photo','damage_observation','damage_assessment','legacy_entity_map'],['damage_photo','image_analysis_result']],focus:'rental_contract'},
]};
const aiSources=['E016','E019','E020'].map(id=>{const item=evidence(id),info=item.artifact.source;const actual=source('sources.local/SSAFIT_Playlist',info.revision,info.path);assert.equal(actual.sha256,info.sourceSha256);return {url:item.url,sha256:actual.sha256};});
project('P003').visualization={kind:'report-flow',title:'같은 입력의 재사용과 생성 실패 처리',summary:'서버 집계 → Snapshot·해시 → 재사용 판단\n필드 보완과 전체 Fallback을 분리한 생성 흐름',sources:aiSources,nodes:[
 {id:'aggregate',title:'서버 집계',detail:'러닝 기록·품질 상태',x:30,y:195},
 {id:'snapshot',title:'Snapshot',detail:'집계 JSON · SHA-256',x:250,y:195},
 {id:'reuse',title:'완료 결과 조회',detail:'회원·유형·입력 해시',x:470,y:55},
 {id:'provider',title:'LLM Provider',detail:'호출·JSON 파싱',x:470,y:195},
 {id:'normalize',title:'필드 보완',detail:'빈 필드만 대체',x:690,y:195},
 {id:'fallback',title:'전체 Fallback',detail:'데이터 부족·호출 실패',x:470,y:355},
 {id:'save',title:'리포트 저장',detail:'COMPLETED · 출처 보존',x:910,y:195},
 {id:'response',title:'REST 응답',detail:'generated · cacheHit',x:910,y:55},
],scenarios:[
 {id:'reuse',label:'동일 입력 재사용',description:'완료된 Snapshot이 있으면 Provider 호출·저장을 생략하고 기존 결과 반환',path:['aggregate','snapshot','reuse','response'],source:'UNCHANGED',generated:false,cacheHit:true,httpStatus:200,providerCall:false},
 {id:'generate',label:'새 리포트 생성',description:'재사용 결과가 없고 집계 품질·Provider 응답이 정상인 요청',path:['aggregate','snapshot','reuse','provider','normalize','save','response'],source:'LLM',generated:true,cacheHit:false,httpStatus:201,providerCall:true},
 {id:'normalize',label:'일부 필드 보완',description:'응답의 빈 필드만 기본 내용으로 보완하고 LLM 출처 유지',path:['aggregate','snapshot','reuse','provider','normalize','save','response'],source:'LLM',generated:true,cacheHit:false,httpStatus:201,providerCall:true},
 {id:'failure',label:'호출·파싱 실패',description:'Provider 예외 또는 JSON 파싱 실패 시 전체 기본 리포트를 완료 상태로 저장',path:['aggregate','snapshot','reuse','provider','fallback','save','response'],source:'FALLBACK',generated:true,cacheHit:false,httpStatus:201,providerCall:true},
 {id:'insufficient',label:'전체 데이터 부족',description:'재사용 결과가 없고 전체 품질이 INSUFFICIENT이면 Provider 호출 없이 Fallback 저장',path:['aggregate','snapshot','reuse','fallback','save','response'],source:'FALLBACK',generated:true,cacheHit:false,httpStatus:201,providerCall:false},
 {id:'force',label:'강제 갱신',description:'forceRefresh=true에서 재사용 조회를 건너뛰고 정상 응답을 새로 생성하는 경우',path:['aggregate','snapshot','provider','normalize','save','response'],source:'LLM',generated:true,cacheHit:false,httpStatus:201,providerCall:true},
]};
project('P002').visualization={kind:'routing',title:'시간창 검사에 따른 승객 배정 변화',summary:'도착 시각과 하차 처리 시간을 분리한 시간창 검사\n전체 배정·운행 제약 충족 여부와 비용을 함께 비교',sources:[{url:evidence('E033').url,sha256:evidence('E033').result.sha256}]};
if(process.argv.includes('--check')){
 const current=JSON.parse(readFileSync(file,'utf8'));
 for(const p of data.dimensions.projects)assert.deepEqual(p.visualization,current.dimensions.projects.find(item=>item.id===p.id).visualization);
 console.log('PASS: visual data matches pinned SQL and reviewed control flow.');
}else {writeFileSync(file,JSON.stringify(data,null,2)+'\n');console.log(`Generated ERDs: ${ct.length} commercial tables, ${rt.length} rental tables; report branches and measured result view.`);}
