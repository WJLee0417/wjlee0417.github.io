import { data } from '../data';
import { EvidenceTag } from '../ui';

export default function EvidenceList({ projectId }: { projectId: string }) {
  const items = data.dimensions.evidence.filter(e => e.projectId === projectId);
  const linkedCount = items.filter(e => e.url || e.publicAssetPath).length;
  if (!items.length) return null;

  return <div className="evidence-section">
    <h3>근거 자료와 공개 상태</h3>
    <p>자료 목록 {items.length}건 · 원본 연결 {linkedCount}건. 아래 목록은 자료의 출처 유형을 구분합니다. 원본 미연결 항목은 현재 페이지에서 실물을 확인할 수 없습니다.</p>
    <div className="evidence-list">{items.map(e => {
      const href = e.url ?? e.publicAssetPath;
      return <article className="evidence-row" id={`evidence-${e.id}`} key={e.id}>
        <span>{e.id}</span>
        <div><strong>{e.label}</strong><p>{href ? <a className="text-link" href={href}>원본 자료 보기 ↗</a> : '원본 미연결'}</p></div>
        <EvidenceTag status={e.verificationStatus}/>
      </article>;
    })}</div>
  </div>;
}
