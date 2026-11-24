import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return <main className="shell">
    <header><div className="brand"><span className="mark">◈</span> AGENT MESH</div><span className="local">● LOCAL RUNTIME</span></header>
    <section className="hero"><p className="eyebrow">MULTI-AGENT CONTROL CENTER</p><h1>One mesh.<br/><em>Many minds.</em></h1><p className="sub">Coordinate local AI agents, delegate tasks, and inspect every step.</p></section>
    <section className="stats">
      <article><small>REGISTERED AGENTS</small><strong>03</strong><span>Demo registry</span></article>
      <article><small>ACTIVE TASKS</small><strong>00</strong><span>Awaiting runtime</span></article>
      <article><small>NETWORK STATUS</small><strong className="online">LOCAL</strong><span>Dashboard preview</span></article>
    </section>
    <section className="panel"><div className="panelhead"><h2>Agent registry</h2><span>STARTER PREVIEW</span></div>
      {["Research Agent","Coding Agent","Review Agent"].map((name,i)=><div className="agent" key={name}><div className="avatar">{["R","C","Q"][i]}</div><div><b>{name}</b><small>{["research · summarization","coding · typescript","review · quality"][i]}</small></div><span className="pill">DEMO</span></div>)}
    </section>
    <footer>AGENT MESH <span>LOCAL-FIRST · OPEN SOURCE</span></footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
