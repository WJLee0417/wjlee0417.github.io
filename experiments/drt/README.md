# DRT 원본 입력 후속 비교 (2026-11-07)

사용자 제공 ZIP의 6월 9일 Python 공유본을 헤드리스로 재실행한다. 원본 탐색 함수는 보존하고 후속 실험에서 `compute_route_time`의 목적지 시간창 검사 시점만 바꾼다. 누락된 `visualization` import는 AST 로더에서 제외하며 원본 `__main__`은 실행하지 않는다.

## 비교 조건

- 입력: ZIP의 `Xpress/Project2_data1_v2.txt`, `Project2_data2_v2.txt` 원본 바이트.
- 각 입력: depot 포함 11개 노드, 수요 그룹 3개, 승객 7명.
- 차량 2대: 제공 Mosel 소규모 모형의 fleet 설정으로 통일. Python CLI의 기본 10대는 사용하지 않음.
- 입력에 명시된 Q=5, U=30. 목적함수는 차량 이동 비용 + 승객 도보 비용이며 단위는 입력 비용 단위.
- 시드 0/1/2/3/42, 원본 MAX_ITER=5,000. 원본 공유본은 초기 배정 실패로 반복 탐색에 들어가기 전에 종료한다. 수정본은 5,000회를 완료한다. 제거·삽입·해 수용·냉각 등의 나머지 코드는 그대로 실행.
- 비교 단계: 원본 공유본 → 도착 기준 수정 후 초기해 → 같은 수정본의 5,000회 탐색 후.

## 수정한 의미

Mosel의 `a(d,v)`는 도착 시각이며 e/l 범위 안에 있어야 한다. 서비스 시간은 후속 이동에 반영된다. 제공 Python은 서비스 시간을 더한 후 시간창을 검사한다. 후속 함수는 대기 → 도착 시간창 검사 → 서비스 시간 추가 순서로 바꾼다. 용량·승하차 선후관계·도보 제한은 완화하지 않는다.

## 결과

두 입력에서 각각 5개 시드 모두 동일했다.

| 단계 | 유효 실행/입력 | 미배정 승객 | 서비스 승객 | 완료해 비용 |
| --- | --- | --- | --- | --- |
| 원본 공유본 | 0/5 | 1명 | 6/7명 | 없음 |
| 검사 시점 수정 후 초기해 | 5/5 | 0명 | 7/7명 | 107 |
| 수정 후 5,000회 탐색 | 5/5 | 0명 | 7/7명 | 107 |

초기해 대비 추가 비용 개선은 없었다. 시간창 해석 수정으로 완전 배정이 가능해진 결과다. 초기해와 탐색 결과는 동일 Python stop-event 모델의 전수열거 기준 107과 일치했다. Xpress를 실행한 결과나 일반적인 최적성 보장은 아니다.

전수열거는 모든 탑승 후보지, 승하차 순열, 두 차량의 수요 그룹 분할을 검사한다. 세 수요 그룹에 한정한 기준이며 차량이 같은 물리 노드를 여러 이벤트로 방문할 수 있는 Python 표현을 사용한다. Mosel 모델의 단일 노드 방문 제약 등과 같다고 단정하지 않는다.

## 재실행

Python 3.11에서:

```powershell
python -m pip install -r experiments/drt/requirements.txt
python -m unittest discover -s experiments/drt -p test_benchmark.py -v
python experiments/drt/benchmark.py --archive "path/to/2025_DRT_ALNS.zip" --output review.local/drt-repeat --experiment-date 2026-11-07
python experiments/drt/plot_time_window.py --results review.local/drt-repeat/results.json
python experiments/drt/publish_summary.py --results review.local/drt-repeat/results.json --output review.local/drt-repeat/summary/results.json
```

재실행 결과는 별도 로컬 폴더에 저장한다. 파일·원본 코드 해시는 실행 전에 확인한다. 원본 입력·로그·경로·독립 검증은 로컬 전체 측정 기록에 남는다. 이번 기록은 Git 제외 폴더 `review.local/drt-experiments/measurements-2026-11-07/`에 보관한다.

공개 폴더 `public/experiments/drt/2026-11-07/`에는 도식과 시드별 유효성·비용·배정 인원·검사 집계만 게시한다. `publish_summary.py`가 원본 입력, 경로 이벤트, 상세 메시지와 텍스트 로그를 제외한다. 자동 승인 검토에서 원본 입력·전체 로그의 공개가 승인 범위 밖으로 차단돼 공개 범위를 결과 수치로 한정했다. 공개 JSON에는 로컬 전체 측정 기록의 SHA-256을 남긴다. 실행 시간은 헤드리스 계측의 wall time이며 제품 응답시간·속도 개선율로 사용하지 않는다.

독립 검사는 실제 정차 노드를 기준으로 전체 승객 배정, 중복, 승하차 순서, 용량, 도보 거리, 도착 시간창, 비용을 재계산한다. 회귀 테스트는 대기·서비스 종료가 시간창을 넘는 경우·늦은 도착·용량·누락·중복·메타데이터·비용 불일치 등을 검사한다.

대규모 입력 두 개에는 Q·U가 없고 사용자가 당시 값을 기억하지 못한다고 확인했다. 값을 만들어 채우지 않고 비교에서 제외했다. 이 실험은 2026-11의 후속 재실행이며, 기존 포트폴리오의 2025년 경험 수치를 재현했다고 표현하지 않는다. 시각화는 이번 실험의 측정값으로 새로 생성했다.
