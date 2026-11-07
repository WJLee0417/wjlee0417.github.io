import { data } from '../data';
import { evidenceLinkLabel } from '../ui';

export default function EvidenceList({ projectId }: { projectId: string }) {
  const items = data.dimensions.evidence.filter(e => e.projectId === projectId && (e.url || e.publicAssetPath));
  const repository = data.meta.evidenceRepository;
  if (!items.length && !repository?.url) return null;

  return <div className="evidence-section">
    <h3>작업 산출물</h3>
    {repository?.url && <p><a className="text-link" href={repository.url} target="_blank" rel="noreferrer">프로젝트 자료 모음 ↗</a></p>}
    {items.length > 0 && <div className="evidence-list">{items.map(e => {
      const href = e.url || e.publicAssetPath!;
      return <article className="evidence-row" id={`evidence-${e.id}`} key={e.id}>
        <span>{e.id}</span>
        <div><a className="text-link" href={href} target="_blank" rel="noreferrer">{e.label} ↗</a><p>{e.description}</p></div>
        <span className="artifact-kind">{evidenceLinkLabel(e)}</span>
      </article>;
    })}</div>}
  </div>;
}
