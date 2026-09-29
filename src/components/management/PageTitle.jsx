export function PageTitle({ title, description, action }) {
  return (
    <div className="mg-page-title">
      <div>
        <p className="mg-eyebrow">KHÔNG GIAN VẬN HÀNH</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
