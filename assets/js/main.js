/* Claudio Paiva · Personal Trainer — interações do site */
(() => {
  // Número do WhatsApp: 55 (Brasil) + 21 (DDD) + número. Troque só aqui.
  const WHATSAPP = "5521970319256";

  // Todo link com data-wa="mensagem" abre o WhatsApp com a mensagem já escrita.
  document.querySelectorAll("[data-wa]").forEach((link) => {
    const msg = link.dataset.wa.trim();
    link.href = `https://wa.me/${WHATSAPP}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
    link.target = "_blank";
    link.rel = "noopener";
  });

  // Anos de experiência e ano do rodapé sempre atualizados.
  const year = new Date().getFullYear();
  document.querySelectorAll("[data-since]").forEach((el) => {
    el.textContent = String(year - Number(el.dataset.since));
  });
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(year);
  });

  // Cabeçalho com fundo ao rolar.
  const header = document.querySelector("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Menu mobile.
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    header.classList.toggle("menu-open", open);
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });

  // Elementos aparecem ao rolar.
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));

    // Destaca no menu a seção que está na tela.
    const links = new Map(
      [...nav.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
    );
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = links.get(entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach((l) => l.removeAttribute("aria-current"));
            link.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }
})();
