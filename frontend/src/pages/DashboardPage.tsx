type DashboardPageProps = {
  logoSrc?: string;
};

export default function DashboardPage({ logoSrc }: DashboardPageProps) {
  return (
    <main className="container">
      <section className="hero">
        <div className="hero-brand">
          {logoSrc ? (
            <img className="hero-logo" src={logoSrc} alt="Brand logo" />
          ) : (
            <div className="hero-logo placeholder" aria-hidden />
          )}
          <div>
            <h2 className="brand">Bảng điều khiển</h2>
            <p className="muted">Tổng quan tiến độ học tập cá nhân</p>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h3>Tiến độ tuần này</h3>
          <p className="muted">0/5 nhiệm vụ đã hoàn thành</p>
          <button className="btn-primary">Xem chi tiết</button>
        </article>

        <article className="card">
          <h3>Mốc thời hạn sắp tới</h3>
          <p className="muted">Chưa có deadline trong 7 ngày</p>
          <button className="btn-secondary">Thêm kế hoạch</button>
        </article>

        <article className="card">
          <h3>Thống kê nhanh</h3>
          <ul className="stats">
            <li><span className="stat-label">Môn học:</span> <strong>0</strong></li>
            <li><span className="stat-label">Bài tập:</span> <strong>0</strong></li>
            <li><span className="stat-label">Đã hoàn thành:</span> <strong>0</strong></li>
          </ul>
        </article>
      </section>
    </main>
  );
}


