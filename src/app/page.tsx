export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>IG Publish API</h1>
      <p>Available endpoints:</p>
      <ul>
        <li><code>POST /api/ig/publish</code></li>
        <li><code>POST /api/lark/bot-notify</code></li>
        <li><code>POST /api/lark/update-record</code></li>
      </ul>
    </main>
  );
}
