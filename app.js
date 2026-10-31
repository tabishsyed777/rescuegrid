(() => {
  const ROWS = 10;
  const COLS = 14;
  const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ flood: 0, blocked: false })));
  const depot = { r: 4, c: 1 };
  const shelter = { r: 5, c: 12 };
  const hazards = [[2, 4, 1], [3, 6, 2], [4, 7, 3], [6, 8, 2], [7, 10, 1]];
  const closures = [[2, 8], [3, 8], [4, 8], [7, 5]];
  hazards.forEach(([r, c, flood]) => { grid[r][c].flood = flood; });
  closures.forEach(([r, c]) => { grid[r][c].blocked = true; });

  const mapGrid = document.getElementById("mapGrid");
  const routeStatus = document.getElementById("routeStatus");
  const tools = Array.from(document.querySelectorAll("[data-tool]"));
  let activeTool = "flood";
  let focusRoute = "both";
  let fastPath = null;
  let safePath = null;

  const keyOf = (r, c) => r + "," + c;
  const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  const same = (a, b, r, c) => a.r === r && a.c === c;

  function describeCell(r, c) {
    const cell = grid[r][c];
    if (same(depot, depot, r, c)) return "Relief depot";
    if (same(shelter, shelter, r, c)) return "Shelter";
    if (cell.blocked) return "Closed road";
    if (cell.flood) return "Flood level " + cell.flood;
    return "Open road";
  }

  function setTool(name) {
    activeTool = name;
    tools.forEach((button) => button.classList.toggle("is-selected", button.dataset.tool === name));
  }

  tools.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));

  function applyTool(r, c) {
    if (activeTool !== "depot" && activeTool !== "shelter" &&
        (same(depot, depot, r, c) || same(shelter, shelter, r, c))) return;
    if (activeTool === "depot") {
      if (same(shelter, shelter, r, c)) return;
      grid[r][c].blocked = false;
      grid[r][c].flood = 0;
      depot.r = r; depot.c = c;
    } else if (activeTool === "shelter") {
      if (same(depot, depot, r, c)) return;
      grid[r][c].blocked = false;
      grid[r][c].flood = 0;
      shelter.r = r; shelter.c = c;
    } else if (activeTool === "flood") {
      grid[r][c].blocked = false;
      grid[r][c].flood = Number(document.getElementById("floodLevel").value);
    } else if (activeTool === "block") {
      grid[r][c].flood = 0;
      grid[r][c].blocked = true;
    } else {
      grid[r][c].flood = 0;
      grid[r][c].blocked = false;
    }
    calculateAndRender();
  }

  function findPath(riskAware) {
    const start = keyOf(depot.r, depot.c);
    const goal = keyOf(shelter.r, shelter.c);
    const costs = new Map([[start, 0]]);
    const previous = new Map();
    const queue = [{ key: start, cost: 0 }];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();
      if (current.cost !== costs.get(current.key)) continue;
      if (current.key === goal) break;
      const [r, c] = current.key.split(",").map(Number);

      directions.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc) || grid[nr][nc].blocked) return;
        const flood = grid[nr][nc].flood;
        const edgeCost = 1 + flood * 0.25 + (riskAware ? flood * 2.1 : 0);
        const nextKey = keyOf(nr, nc);
        const nextCost = current.cost + edgeCost;
        if (nextCost < (costs.get(nextKey) ?? Infinity)) {
          costs.set(nextKey, nextCost);
          previous.set(nextKey, current.key);
          queue.push({ key: nextKey, cost: nextCost });
        }
      });
    }

    if (!costs.has(goal)) return null;
    const path = [goal];
    let cursor = goal;
    while (cursor !== start) {
      cursor = previous.get(cursor);
      if (!cursor) return null;
      path.push(cursor);
    }
    path.reverse();
    const exposure = path.reduce((sum, key) => {
      const [r, c] = key.split(",").map(Number);
      return sum + grid[r][c].flood;
    }, 0);
    const moves = Math.max(0, path.length - 1);
    const minutes = Math.round(moves * 3 + exposure * 2);
    return { path, moves, exposure, minutes, cost: costs.get(goal) };
  }

  function formatRoute(route, prefix) {
    const title = document.getElementById(prefix + "Title");
    const summary = document.getElementById(prefix + "Summary");
    const distance = document.getElementById(prefix + "Distance");
    const time = document.getElementById(prefix + "Time");
    const risk = document.getElementById(prefix + "Risk");
    if (!route) {
      title.textContent = "No route available";
      summary.textContent = "Clear a road closure to reconnect depot and shelter.";
      distance.textContent = "—";
      time.textContent = "—";
      risk.textContent = "—";
      return;
    }
    title.textContent = route.moves + " road " + (route.moves === 1 ? "move" : "moves");
    summary.textContent = "Estimated path cost " + route.cost.toFixed(1) + " points";
    distance.textContent = route.moves + " tiles";
    time.textContent = route.minutes + " min";
    risk.textContent = route.exposure + " points";
  }

  function renderMap() {
    mapGrid.replaceChildren();
    const fastSet = new Set(fastPath ? fastPath.path : []);
    const safeSet = new Set(safePath ? safePath.path : []);
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const cell = grid[r][c];
        const key = keyOf(r, c);
        const isDepot = same(depot, depot, r, c);
        const isShelter = same(shelter, shelter, r, c);
        const button = document.createElement("button");
        let className = "tile";
        if (cell.blocked) className += " tile-block";
        else if (cell.flood) className += " tile-flood-" + cell.flood;
        if (fastSet.has(key) && safeSet.has(key)) className += " tile-path-both";
        else if (fastSet.has(key)) className += " tile-path-fast";
        else if (safeSet.has(key)) className += " tile-path-safe";
        if (focusRoute === "fast" && safeSet.has(key) && !fastSet.has(key)) className += " tile-route-muted";
        if (focusRoute === "safe" && fastSet.has(key) && !safeSet.has(key)) className += " tile-route-muted";
        if (isDepot) className += " tile-depot";
        if (isShelter) className += " tile-shelter";
        button.className = className;
        button.type = "button";
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", "Row " + (r + 1) + ", column " + (c + 1) + ": " + describeCell(r, c));
        button.title = "Row " + (r + 1) + ", column " + (c + 1) + " · " + describeCell(r, c);
        button.innerHTML = isDepot
          ? '<span class="tile-mark">D</span>'
          : isShelter
            ? '<span class="tile-mark">S</span>'
            : cell.blocked
              ? '<span class="tile-mark">×</span>'
              : cell.flood
                ? '<span class="tile-mark">' + cell.flood + '</span>'
                : "";
        mapGrid.appendChild(button);
      }
    }
  }

  function updateDispatch() {
    const demand = Math.max(0, Number(document.getElementById("demand").value) || 0);
    const capacity = Math.max(1, Number(document.getElementById("capacity").value) || 1);
    const fleet = Math.max(0, Number(document.getElementById("fleet").value) || 0);
    const needed = Math.ceil(demand / capacity);
    const result = document.getElementById("dispatchResult");
    const shortage = Math.max(0, needed - fleet);
    result.classList.toggle("shortfall", shortage > 0);
    if (demand === 0) {
      result.innerHTML = "<b>No kits requested.</b> Add a demand to estimate a dispatch.";
    } else if (shortage > 0) {
      result.innerHTML = "<b>" + needed + " trips needed.</b> Current fleet is short by " + shortage + " truck" + (shortage === 1 ? "" : "s") + ".";
    } else {
      result.innerHTML = "<b>" + needed + " trips planned.</b> Fleet has capacity for the requested " + demand + " kits.";
    }
  }

  function calculateAndRender() {
    fastPath = findPath(false);
    safePath = findPath(true);
    renderMap();
    formatRoute(fastPath, "fast");
    formatRoute(safePath, "safe");
    updateDispatch();
    routeStatus.textContent = fastPath && safePath ? "Routes are up to date" : "One or more route options are unavailable";
  }

  mapGrid.addEventListener("click", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile) return;
    const buttons = Array.from(mapGrid.children);
    const index = buttons.indexOf(tile);
    if (index < 0) return;
    applyTool(Math.floor(index / COLS), index % COLS);
  });

  document.querySelectorAll("[data-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      focusRoute = button.dataset.focus;
      document.querySelectorAll(".route-card").forEach((card) => card.classList.remove("is-focused"));
      document.getElementById(focusRoute === "fast" ? "fastCard" : "safeCard").classList.add("is-focused");
      renderMap();
    });
  });

  document.getElementById("runPlanner").addEventListener("click", calculateAndRender);
  document.getElementById("resetScenario").addEventListener("click", () => {
    grid.forEach((row) => row.forEach((cell) => { cell.flood = 0; cell.blocked = false; }));
    hazards.forEach(([r, c, flood]) => { grid[r][c].flood = flood; });
    closures.forEach(([r, c]) => { grid[r][c].blocked = true; });
    depot.r = 4; depot.c = 1;
    shelter.r = 5; shelter.c = 12;
    document.getElementById("demand").value = 120;
    document.getElementById("capacity").value = 40;
    document.getElementById("fleet").value = 4;
    setTool("flood");
    focusRoute = "both";
    calculateAndRender();
  });
  ["demand", "capacity", "fleet", "floodLevel"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateDispatch);
    document.getElementById(id).addEventListener("change", calculateAndRender);
  });

  renderMap();
  calculateAndRender();
})();