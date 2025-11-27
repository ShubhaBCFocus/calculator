import React, { useEffect, useState } from "react";
import "./App.css";

const ALLOWED = /^[0-9+\-*/().%\s]*$/; // allowed chars for expression
const MAX_LEN = 200;

export default function App() {
  const [expr, setExpr] = useState("");
  const [preview, setPreview] = useState("0");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("calc_theme_v2") || "dark"
  );

  // apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("calc_theme_v2", theme);
  }, [theme]);

  // compute live preview
  useEffect(() => {
    if (!expr) {
      setPreview("0");
      setError("");
      return;
    }

    if (!ALLOWED.test(expr) || expr.length > MAX_LEN) {
      setPreview("Error");
      setError("Invalid input");
      return;
    }

    // sanitize tokens: replace unicode operators with JS ones
    let safe = expr.replace(/÷/g, "/").replace(/×/g, "*");

    // percent: "50%" -> "(50/100)"
    safe = safe.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

    // trim trailing operators or dots for preview
    safe = safe.replace(/[\+\-\*\/\.]+$/, "");
    if (!safe) {
      setPreview("0");
      setError("");
      return;
    }

    try {
      // eval for preview (we validated allowed chars)
      // eslint-disable-next-line no-eval
      const v = eval(safe);
      if (typeof v === "number") {
        if (!isFinite(v)) {
          setPreview("Error");
          setError("Divide by zero");
        } else {
          setPreview(formatNumber(v));
          setError("");
        }
      } else {
        setPreview("Error");
        setError("Invalid result");
      }
    } catch {
      setPreview("");
    }
  }, [expr]);

  // keyboard handling
  useEffect(() => {
    function onKey(e) {
      const k = e.key;

      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        push(k);
        return;
      }
      if (k === ".") {
        e.preventDefault();
        push(".");
        return;
      }
      if (k === "+" || k === "-" || k === "*" || k === "/" || k === "%") {
        e.preventDefault();
        push(k);
        return;
      }
      if (k === "Enter" || k === "=") {
        e.preventDefault();
        evaluate();
        return;
      }
      if (k === "Backspace") {
        e.preventDefault();
        del();
        return;
      }
      if (k === "Escape") {
        e.preventDefault();
        clearAll();
        return;
      }
      if (k === "(" || k === ")") {
        e.preventDefault();
        push(k);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr]);

  // helpers
  function formatNumber(n) {
    if (Math.abs(n - Math.round(n)) < 1e-12) return String(Math.round(n));
    let s = n.toFixed(10);
    s = s.replace(/\.?0+$/, "");
    return s;
  }

  function push(v) {
    // guard
    if (expr === "Error" || expr === "Infinity" || expr === "NaN") setExpr("");
    if (expr.length >= MAX_LEN) return;

    // decimal handling: prevent multiple decimals in single number
    if (v === ".") {
      const lastNum = expr.split(/[\+\-\*\/\(\)]/).pop() || "";
      if (lastNum.includes(".")) return;
      if (lastNum === "") setExpr((p) => p + "0.");
      else setExpr((p) => p + ".");
      return;
    }

    // parentheses behaviour: allow implicit multiplication before '('
    if (v === "(") {
      if (expr === "" || /[\+\-\*\/\(]$/.test(expr)) setExpr((p) => p + "(");
      else setExpr((p) => p + "*(");
      return;
    }
    if (v === ")") {
      const open = (expr.match(/\(/g) || []).length;
      const close = (expr.match(/\)/g) || []).length;
      if (open > close && /[0-9)]$/.test(expr)) setExpr((p) => p + ")");
      return;
    }

    // operators
    if (/[\+\-\*\/%]/.test(v)) {
      if (expr === "") {
        if (v === "-") setExpr("-"); // allow unary minus
        return;
      }
      // if trailing operator, replace (except allow unary minus)
      if (/[\+\-\*\/%]$/.test(expr)) {
        if (v === "-" && !/[\-]$/.test(expr)) {
          setExpr((p) => p + "-");
          return;
        }
        setExpr((p) => p.replace(/[\+\-\*\/%]+$/, v));
        return;
      }
      setExpr((p) => p + v);
      return;
    }

    // digits
    if (/[0-9]/.test(v)) {
      setExpr((p) => p + v);
    }
  }

  function del() {
    if (!expr) return setExpr("");
    setExpr((p) => p.slice(0, -1));
  }

  function clearAll() {
    setExpr("");
    setPreview("0");
    setError("");
  }

  function evaluate() {
    if (!expr) return;
    if (!ALLOWED.test(expr)) {
      setExpr("Error");
      setPreview("Error");
      setError("Invalid input");
      return;
    }

    try {
      let safe = expr.replace(/÷/g, "/").replace(/×/g, "*");
      safe = safe.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
      safe = safe.replace(/[\+\-\*\/\.]+$/, "");
      // eslint-disable-next-line no-eval
      const val = eval(safe);
      if (typeof val !== "number" || !isFinite(val)) {
        setExpr("Error");
        setPreview("Error");
        setError("Cannot divide by zero");
        return;
      }
      const out = formatNumber(val);
      setExpr(out);
      setPreview(out);
      setError("");
    } catch {
      setExpr("Error");
      setPreview("Error");
      setError("Evaluation error");
    }
  }

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <div className="app-root">
      <header className="top">
        <h2 className="title">React Calculator</h2>
        <div className="controls">
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </header>

      <main className="calc-wrap">
        <section className="calculator" role="application" aria-label="Calculator">
          <div className="display">
            <div className="expr">{expr || "0"}</div>
            <div className="preview">{error ? error : preview}</div>
          </div>

          <div className="pad">
            <button className="key small danger" onClick={clearAll}>C</button>
            <button className="key small warn" onClick={del}>DEL</button>
            <button className="key small op" onClick={() => push("%")}>%</button>
            <button className="key small op" onClick={() => push("/")}>÷</button>

            <button className="key" onClick={() => push("7")}>7</button>
            <button className="key" onClick={() => push("8")}>8</button>
            <button className="key" onClick={() => push("9")}>9</button>
            <button className="key op" onClick={() => push("*")}>×</button>

            <button className="key" onClick={() => push("4")}>4</button>
            <button className="key" onClick={() => push("5")}>5</button>
            <button className="key" onClick={() => push("6")}>6</button>
            <button className="key op" onClick={() => push("-")}>−</button>

            <button className="key" onClick={() => push("1")}>1</button>
            <button className="key" onClick={() => push("2")}>2</button>
            <button className="key" onClick={() => push("3")}>3</button>
            <button className="key op" onClick={() => push("+")}>+</button>

            <button className="key zero" onClick={() => push("0")}>0</button>
            <button className="key" onClick={() => push(".")}>.</button>
            <button className="key equal span" onClick={evaluate}>=</button>
          </div>

          <div className="hint">Tip: use keyboard (numbers, + - * /, Enter =, Backspace = DEL, Esc = clear)</div>
        </section>
      </main>
    </div>
  );
}
