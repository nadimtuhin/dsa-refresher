// app.js: shared page script (cached once by the browser). Menu drawer, progress, filter, copy, prev/next keys.
(() => {
  const KEY = "dsa-refresher-done";
  const done = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  const total = document.querySelectorAll("aside .done").length;
  const $ = id => document.getElementById(id);
  const save = () => localStorage.setItem(KEY, JSON.stringify([...done]));

  function render() {
    document.querySelectorAll(".done").forEach(b => {
      b.checked = done.has(b.dataset.id);
      b.closest("a")?.classList.toggle("isdone", b.checked);
    });
    $("cnt").textContent = $("cnt2").textContent = done.size;
    $("bar").style.width = (done.size / total) * 100 + "%";
  }
  document.querySelectorAll(".done").forEach(b => {
    b.addEventListener("click", e => e.stopPropagation()); // ticking in the menu must not follow the link
    b.addEventListener("change", () => {
      b.checked ? done.add(b.dataset.id) : done.delete(b.dataset.id);
      save();
      render();
    });
  });
  addEventListener("storage", e => { // another tab ticked something
    if (e.key !== KEY) return;
    done.clear();
    JSON.parse(e.newValue || "[]").forEach(x => done.add(x));
    render();
  });
  render();

  $("q").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("aside a[data-id]").forEach(a => (a.style.display = a.textContent.toLowerCase().includes(q) ? "" : "none"));
  });

  document.querySelectorAll(".copy").forEach(btn =>
    btn.addEventListener("click", () =>
      navigator.clipboard.writeText(btn.nextElementSibling.textContent).then(() => {
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      })
    )
  );

  // drawer (below 900px only, same breakpoint as the CSS)
  const desk = matchMedia("(min-width: 900px)"), menu = $("menu");
  const setNav = open => {
    document.body.classList.toggle("nav-open", open);
    menu.setAttribute("aria-expanded", open);
    if (open) document.querySelector("aside a.on")?.scrollIntoView({ block: "center" });
  };
  menu.addEventListener("click", () => setNav(true));
  $("scrim").addEventListener("click", () => setNav(false));
  $("navclose").addEventListener("click", () => setNav(false));
  desk.addEventListener("change", () => desk.matches && setNav(false));
  document.querySelector("aside a.on")?.scrollIntoView({ block: "center" }); // desktop sidebar: show where we are

  // keyboard: left/right arrows walk the book (but not while typing or focused on an animation)
  addEventListener("keydown", e => {
    if (e.key === "Escape") return setNav(false);
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, select, textarea, .anim")) return;
    const a = document.querySelector(e.key === "ArrowLeft" ? ".pager .pv" : e.key === "ArrowRight" ? ".pager .nx" : null);
    if (a) location.href = a.href;
  });
})();
