const svg = d3.select("svg");
const width = window.innerWidth;
const height = window.innerHeight;

d3.csv("data/music.csv").then(rawData =>{
    // One person who responded to the survey that generated this data entered 9999999 for BPM
    // which is obviously unrealistic, so I'm taking that one out
    rawData = rawData.filter(d => +d["BPM"] < 1000);

    drawHeatmap(rawData);
    drawStarChart(rawData);
    drawSankeyChart(rawData);
});

function drawHeatmap(rawData){
    const conditions = ["Anxiety", "Depression", "Insomnia", "OCD"];
    const genres = Array.from(new Set(rawData.map(d => d["Fav genre"]).filter(Boolean)));

    // Prepare data structure for the heatmap
    const scores = {};
    genres.forEach(genre => {
        scores[genre] = {};
        conditions.forEach(cond => {
            scores[genre][cond] = [];
        });
    });

    // Compute values in the heatmap
    rawData.forEach(d => {
        const genre = d["Fav genre"];
        if (!genre || !genres.includes(genre)) return;

        conditions.forEach(cond => {
            const val = +d[cond];
            if (!isNaN(val)){
                scores[genre][cond].push(val);
            }
        });
    });

    const heatmapData = [];
    genres.forEach((genre, i) => {
        conditions.forEach((cond, j) => {
            const values = scores[genre][cond];
            const avg = values.length > 0 ? d3.mean(values) : null;
            heatmapData.push({ genre, condition: cond, value: avg });
        });
    });

    const heatMargin = { top: 400, left: 100 };
    const cellWidth = 40;
    const cellHeight = 40;

    const x = d3.scaleBand().domain(genres).range([heatMargin.left, heatMargin.left + genres.length * cellWidth]).padding(0.05);
    const y = d3.scaleBand().domain(conditions).range([heatMargin.top, heatMargin.top + conditions.length * cellHeight]).padding(0.05);
    
    const color = d3.scaleLinear()
        .domain([0, 10])
        .range(["#FFFFFF", "#000000"])

    const heatmapGroup = svg.append("g").attr("class", "heatmap");

    heatmapGroup.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.genre))
        .attr("y", d => y(d.condition))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => d.value != null ? color(d.value) : "#ccc");

    heatmapGroup.selectAll(".genreLabel")
        .data(genres)
        .enter()
        .append("text")
        .attr("x", d => x(d) + x.bandwidth() / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 15)
        .attr("text-anchor", "end")
        .attr("transform", d => `rotate(-45, ${x(d) + x.bandwidth() / 2}, ${heatMargin.top + conditions.length * cellHeight + 15})`)
        .text(d => d);

    svg.selectAll(".conditionLabel")
        .data(conditions)
        .enter()
        .append("text")
        .attr("x", heatMargin.left - 10)
        .attr("y", d => y(d) + y.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .text(d => d);
    
    heatmapGroup.append("text")
        .attr("x", 10)
        .attr("y", ((y.range()[0] + y.range()[1]) / 2) + 5)
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90, 10, ${(y.range()[0] + y.range()[1]) / 2})`)
        .style("font-size", "14px")
        .text("Severity of Mental Health Condition");

    heatmapGroup.append("text")
        .attr("x", (x.range()[0] + x.range()[1]) / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 70)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Favorite Music Genre");

    heatmapGroup.append("text")
        .attr("x", (x.range()[0] + x.range()[1]) / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 110)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Severity of Anxiety, Depression, OCD, and Insomnia by Favorite Genre of Music")

    heatmapGroup.append("text")
        .attr("x", (x.range()[0] + x.range()[1]) / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 130)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text("(Darker = More Severe, Lighter = Less Severe)")

}

function drawStarChart(rawData) {
    const groups = ["Improve", "No effect", "Worsen"];
    const dimensions = ["Anxiety", "Depression", "Insomnia", "OCD", "Hours per day", "Age", "BPM"];
    const dimensionLabels = {
        "Anxiety": "Severity of Anxiety",
        "Depression": "Severity of Depression",
        "Insomnia": "Severity of Insomnia",
        "OCD": "Severity of OCD",
        "Hours per day": "Daily Listening Hours",
        "Age": "Age of Patient",
        "BPM": "Average Music Tempo"
    };
    const colors = {
        "Improve": "#00aa00",
        "No effect": "#ab8400",
        "Worsen": "#ff0000"
    };

    const averages = groups.map(effect => {
        const groupData = rawData.filter(d => 
            d["Music effects"] === effect &&
            dimensions.every(dim => d[dim] !== "" && !isNaN(+d[dim]))
        );

        const values = {};
        dimensions.forEach(dim => {
            values[dim] = d3.mean(groupData, d => +d[dim]);
        });

        return { effect, values };
    });

    const scale = {};
    dimensions.forEach(dim => {
        const allValues = rawData.map(d => +d[dim]).filter(v => !isNaN(v));
        scale[dim] = d3.scaleLinear()
            .domain([0, d3.max(allValues)])
            .range([0, 100]);
    });

    const radarWidth = 300, radarHeight = 300, radius = 100;
    const angleSlice = (2 * Math.PI) / dimensions.length;

    const radarGroup = svg.append("g")
        .attr("class", "star-chart")
        .attr("transform", `translate(${1000}, ${525})`);
    
     dimensions.forEach((dim, i) => {
        const angle = i * angleSlice;
        const x = radius * Math.cos(angle - Math.PI / 2);
        const y = radius * Math.sin(angle - Math.PI / 2);

        radarGroup.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", "#ccc");

        radarGroup.append("text")
            .attr("x", x * 1.2)
            .attr("y", y * 1.2)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .style("font-size", "10px")
            .text(d => dimensionLabels[dim] || dim);

    });

    averages.forEach(group => {
        const points = dimensions.map((dim, i) => {
            const angle = i * angleSlice;
            const val = scale[dim](group.values[dim]);
            return [
                val * Math.cos(angle - Math.PI / 2),
                val * Math.sin(angle - Math.PI / 2)
            ];
        });

        radarGroup.append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill-opacity", 0)
            .attr("stroke", colors[group.effect])
            .attr("stroke-width", 2);
    });
    const legend = svg.append("g")
        .attr("transform", `translate(${1200}, ${450})`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .text("Effect of Music on Mood")
        .style("font-weight", "bold")
        .style("font-size", "14px");

    groups.forEach((g, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colors[g]);
        row.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .text(g)
            .style("font-size", "12px");
    });

    svg.append("text")
        .attr("x", 1200)
        .attr("y", 670)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Comparison of Statistics by Effect of Music on Mood")
}

function drawSankeyChart(rawData) {
    const effects = ["Improve", "No effect", "Worsen"];
    const genreEffectCounts = {};

    const effectColors = {
        "Improve": "#00aa00",
        "No effect": "#ab8400",
        "Worsen": "#ff0000"
    };

    rawData.forEach(d => {
        const genre = d["Fav genre"];
        const effect = d["Music effects"];

        if (genre && effects.includes(effect)) {
            if (!genreEffectCounts[genre]) {
                genreEffectCounts[genre] = { "Improve": 0, "No effect": 0, "Worsen": 0 };
            }
            genreEffectCounts[genre][effect]++;
        }
    });

    const nodes = [];
    const nodeMap = new Map();
    let nodeIndex = 0;

    function getNode(name) {
        if (!nodeMap.has(name)) {
            nodeMap.set(name, nodeIndex++);
            nodes.push({ name });
        }
        return nodeMap.get(name);
    }

    const links = [];
    Object.entries(genreEffectCounts).forEach(([genre, effectsMap]) => {
        const genreIdx = getNode(genre);
        Object.entries(effectsMap).forEach(([effect, count]) => {
            const effectIdx = getNode(effect);
            if (count > 0) {
                links.push({
                    source: genreIdx,
                    target: effectIdx,
                    value: count
                });
            }
        });
    });

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[150, 60], [width - 100, height - 310]]);


    const sankeyData = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 50)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("How Do Different Music Genres Effect the Mood of Patients?")

    const sankeyGroup = svg.append("g")
    .attr("class", "sankey")
    .attr("transform", "translate(0, 0)"); // optional, can leave as is

    const genreX = d3.min(sankeyData.nodes.filter(d => !effects.includes(d.name)), d => d.x0);
    const effectX = d3.min(sankeyData.nodes.filter(d => effects.includes(d.name)), d => d.x0);

    // Add group labels
    sankeyGroup.append("text")
        .attr("x", genreX - 50)
        .attr("y", 50) // Adjust based on diagram height
        .attr("text-anchor", "center")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Favorite Genre");

    sankeyGroup.append("text")
        .attr("x", effectX - 70)
        .attr("y", 50)
        .attr("text-anchor", "center")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Effect of Music on Mood");

    sankeyGroup.append("g")
        .selectAll("path")
        .data(sankeyData.links)
        .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => {
            const effectNode = sankeyData.nodes[d.target.index];
            return effectColors[effectNode.name] || "#999";
        })
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", d => Math.max(1, d.width));

    const node = sankeyGroup.append("g")
        .selectAll("g")
        .data(sankeyData.nodes)
        .enter().append("g");

    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => {
            return effectColors[d.name] || "#999";
        })
        .attr("stroke", "#000");

    node.append("text")
        .attr("x", d => d.x0 + 30)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .text(d => d.name)
        .filter(d => d.x0 < width / 2)
        .attr("x", d => d.x1 - 30)
        .attr("text-anchor", "end");
}
