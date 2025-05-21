// ChatGPT was used to get the basic skeleton of the code for the graphs, and I modified things like position, size, color, text, etc, etc.
// This version adds some interactivity to the Sankey and Star charts.

const svg = d3.select("svg");

const width = window.innerWidth;
const height = window.innerHeight;

// The dashboard should work if the user changes window size
window.addEventListener('resize', () => location.reload());

// Load data and call funcs to draw the graphs
d3.csv("data/music.csv").then(rawData =>{
    // One person who responded to the survey that generated this data entered 9999999 for BPM
    // which is obviously unrealistic, so I'm taking that one out
    rawData = rawData.filter(d => +d["BPM"] < 1000);

    drawHeatmap(rawData);
    
    drawSankeyChart(rawData);

    drawStarChart(rawData);
});

// This function creates the heatmap
function drawHeatmap(rawData) {
    const conditions = ["Anxiety", "Depression", "Insomnia", "OCD"];
    const genres = Array.from(new Set(rawData.map(d => d["Fav genre"]).filter(Boolean)));

    const scores = {};
    genres.forEach(genre => {
        scores[genre] = {};
        conditions.forEach(cond => {
            scores[genre][cond] = [];
        });
    });

    rawData.forEach(d => {
        const genre = d["Fav genre"];
        if (!genre || !genres.includes(genre)) return;

        conditions.forEach(cond => {
            const val = +d[cond];
            if (!isNaN(val)) {
                scores[genre][cond].push(val);
            }
        });
    });

    const heatmapData = [];
    genres.forEach(genre => {
        conditions.forEach(cond => {
            const values = scores[genre][cond];
            const avg = values.length > 0 ? d3.mean(values) : null;
            heatmapData.push({ genre, condition: cond, value: avg });
        });
    });

    const heatMargin = { top: height * 0.55, left: width * 0.05 };
    const cellWidth = (width * 0.55) / genres.length;
    const cellHeight = (height * 0.3) / conditions.length;

    const x = d3.scaleBand().domain(genres).range([heatMargin.left, heatMargin.left + genres.length * cellWidth]).padding(0.05);
    let currentY = d3.scaleBand().domain(conditions).range([heatMargin.top, heatMargin.top + conditions.length * cellHeight]).padding(0.05);

    const color = d3.scaleLinear().domain([0, 10]).range(["#FFFFFF", "#000000"]);

    const heatmapGroup = svg.append("g").attr("class", "heatmap");

    // Draw initial cells
    heatmapGroup.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.genre))
        .attr("y", d => currentY(d.condition))
        .attr("width", x.bandwidth())
        .attr("height", currentY.bandwidth())
        .attr("fill", d => d.value != null ? color(d.value) : "#ccc");

    // Titles
    heatmapGroup.append("text")
        .attr("x", (x.range()[0] + x.range()[1]) / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 0.125 * height)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Severity of Anxiety, Depression, OCD, and Insomnia by Favorite Genre of Music");

    heatmapGroup.append("text")
        .attr("x", (x.range()[0] + x.range()[1]) / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 0.145 * height)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text("(Darker = More Severe, Lighter = Less Severe)");

    // Y-axis label
    heatmapGroup.append("text")
        .attr("x", 10)
        .attr("y", ((currentY.range()[0] + currentY.range()[1]) / 2) + 0.01 * height)
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90, 10, ${(currentY.range()[0] + currentY.range()[1]) / 2})`)
        .style("font-size", "14px")
        .text("Severity of Mental Health Condition");

    // X-axis label
    heatmapGroup.append("text")
        .attr("x", (x.range()[0] + x.range()[1]) / 2)
        .attr("y", heatMargin.top + conditions.length * cellHeight + 0.1 * height)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Favorite Music Genre");

    renderHeatmap(genres);
    renderRows(conditions);

    hasSorted = false; hasWaitedTenSeconds = false;

    function renderHeatmap(orderedGenres) {
        const newX = d3.scaleBand().domain(orderedGenres).range([heatMargin.left, heatMargin.left + orderedGenres.length * cellWidth]).padding(0.05);

        const genreLabels = svg.selectAll(".genreLabel")
            .data(orderedGenres, d => d);

        genreLabels.transition()
            .duration(750)
            .attr("x", d => newX(d) + newX.bandwidth() / 2)
            .attr("transform", d => `rotate(-45, ${newX(d) + newX.bandwidth() / 2}, ${heatMargin.top + conditions.length * cellHeight + 15})`);

        genreLabels.enter()
            .append("text")
            .attr("class", "genreLabel")
            .attr("x", d => newX(d) + newX.bandwidth() / 2)
            .attr("y", heatMargin.top + conditions.length * cellHeight + 15)
            .attr("text-anchor", "end")
            .style("font-size", "10px")
            .attr("transform", d => `rotate(-45, ${newX(d) + newX.bandwidth() / 2}, ${heatMargin.top + conditions.length * cellHeight + 15})`)
            .text(d => d)
            .style("cursor", "pointer")
            .on("click", function(clickedGenre) {
                hasSorted = true; tryRemoveInstruction();

                console.log("clicked on genre", clickedGenre);
                const sortedConditions = conditions.slice().sort((a, b) => {
                    const valA = heatmapData.find(d => d.genre === clickedGenre && d.condition === a)?.value ?? 0;
                    const valB = heatmapData.find(d => d.genre === clickedGenre && d.condition === b)?.value ?? 0;
                    return d3.descending(valA, valB);
                });
                renderRows(sortedConditions);
            });

        // Update cells
        svg.selectAll(".cell")
            .transition()
            .duration(750)
            .attr("x", d => newX(d.genre))
            .attr("width", newX.bandwidth());
    }

    function renderRows(orderedConditions) {
        currentY = d3.scaleBand().domain(orderedConditions).range([heatMargin.top, heatMargin.top + orderedConditions.length * cellHeight]).padding(0.05);

        svg.selectAll(".cell")
            .transition()
            .duration(750)
            .attr("y", d => currentY(d.condition))
            .attr("height", currentY.bandwidth());

        svg.selectAll(".conditionLabel")
            .transition()
            .duration(750)
            .attr("y", d => currentY(d) + currentY.bandwidth() / 2);
    }

    // Add condition labels with click-to-sort genres
    svg.selectAll(".conditionLabel")
        .data(conditions)
        .enter()
        .append("text")
        .attr("class", "conditionLabel")
        .attr("x", heatMargin.left + 0.0001 * width)
        .attr("y", d => currentY(d) + currentY.bandwidth() / 2)
        .attr("text-anchor", "end")
        .style("font-size", "10px")
        .attr("alignment-baseline", "middle")
        .text(d => d)
        .style("cursor", "pointer")
        .on("click", function(clickedCondition) {
            hasSorted = true; tryRemoveInstruction();

            console.log("clicked on", clickedCondition);
            const sortedGenres = genres.slice().sort((a, b) => {
                const valA = heatmapData.find(d => d.genre === a && d.condition === clickedCondition)?.value ?? 0;
                const valB = heatmapData.find(d => d.genre === b && d.condition === clickedCondition)?.value ?? 0;
                return d3.descending(valA, valB);
            });
            renderHeatmap(sortedGenres);
        });

    const instructionBox = svg.append("g")
        .attr("class", "instruction-group");
    const boxWidth = width * 0.125;
    const boxHeight = height * 0.04;
    const boxX = width * 0.275;
    const boxY = height * 0.5;

    // Draw instruction box
    instructionBox.append("rect")
        .attr("x", boxX)
        .attr("y", boxY)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("rx", 6)
        .attr("ry", 6);

    // Instruction text
    instructionBox.append("text")
        .attr("x", boxX + boxWidth / 2)
        .attr("y", boxY + boxHeight / 2 + 4)
        .attr("text-anchor", "middle")
        .style("font-size", Math.min(width, height) * 0.015)
        .style("fill", "black")
        .text("Click on axis labels to sort.");


    // Hide the instructions after the user has interacted, and 10 seconds have passed
    function tryRemoveInstruction() {
        console.log("attempting to remove instruction");
        if (hasSorted && hasWaitedTenSeconds) {
            instructionBox.transition().duration(500).style("opacity", 0).remove();
        }
    }
    setTimeout(() => {
        hasWaitedTenSeconds = true;
        tryRemoveInstruction();
    }, 10000);
}

// Function to draw the star chart
function drawStarChart(rawData) {
    // Set up data to be used
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

    // Compute averages from the data
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

    // Figure out the scale to be used based on the maximum value seen in the dataset
    const scale = {};
    dimensions.forEach(dim => {
        const allValues = rawData.map(d => +d[dim]).filter(v => !isNaN(v));
        scale[dim] = d3.scaleLinear()
            .domain([0, d3.max(allValues)])
            .range([0, 100]);
    });

    // Parameters for the graph
    const radius = width / 10;
    const angleSlice = (2 * Math.PI) / dimensions.length;
    const radarGroup = svg.append("g")
        .attr("class", "star-chart")
        .attr("transform", `translate(${width * 0.75}, ${height * 0.75})`);
    
    // Draw the axes and labels of the graph
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
            .attr("x", x * 1.1)
            .attr("y", y * 1.1)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .style("font-size", "10px")
            .text(d => dimensionLabels[dim] || dim);

    });

    // Create a polygon with corners at the axes for each of the 3 groups
    averages.forEach(group => {
        const points = dimensions.map((dim, i) => {
            const angle = i * angleSlice;
            const val = scale[dim](group.values[dim]);
            return [
                val * Math.cos(angle - Math.PI / 2) * (width / 1000),
                val * Math.sin(angle - Math.PI / 2) * (width / 1000)
            ];
        });

        radarGroup.append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill-opacity", 0)
            .attr("stroke", colors[group.effect])
            .attr("stroke-width", 2);
    });

    // Legend
    svg.append("g")
        .attr("transform", `translate(${width * 0.89}, ${height * 0.7})`)
        .call(g => {
            g.append("text")
                .text("Effect of Music on Mood")
                .attr("y", -10).style("font-weight", "bold").style("font-size", "14px");
            groups.forEach((group, i) => {
                const row = g.append("g").attr("transform", `translate(0, ${i * 30})`);
                row.append("rect").attr("width", 12).attr("height", 12).attr("fill", colors[group]);
                row.append("text").attr("x", 18).attr("y", 10).style("font-size", "12px").text(group);
            });
        });

    // Graph title
    svg.append("text")
        .attr("x", width * 0.75)
        .attr("y", height * 0.45)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Comparison of Statistics by Effect of Music on Mood")

    // Zoom In Effect
    const lensRadius = 200;

    // Set up the magnifier lens
    svg.append("clipPath")
        .attr("id", "lens-clip")
    .append("circle")
        .attr("r", lensRadius);
    const lensGroup = svg.append("g")
        .attr("class", "lens")
        .style("display", "none");
    lensGroup.append("circle")
        .attr("r", lensRadius)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill-opacity", 1);
    const lensContent = lensGroup.append("g")
        .attr("clip-path", "url(#lens-clip)");
    const overlayOffset = radius * 1.5;

    // Set up a "hitbox" where the mouse can hover over to zoom in
    radarGroup.append("rect")
        .attr("x", -overlayOffset)
        .attr("y", -overlayOffset)
        .attr("width", radius * 3)
        .attr("height", radius * 3)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function(event) {
            onMouseMove.call(this, event);
        })
        .on("mouseleave", () => lensGroup.style("display", "none"));

    let hasMagnified = false;
    let hasWaitedTenSeconds = false;

    // Function for the interactivity
    function onMouseMove() {
        // Logic for disappearing the instruction box
        if (!hasMagnified) {
            hasMagnified = true;
            tryHideInstruction();
        }

        // get the mouse position
        const [svgX, svgY] = d3.mouse(svg.node());

        // Convert coordinates on the zoomable area to where the lens content is
        const localX = svgX - width * 0.75;
        const localY = svgY - height * 0.75;

        // Draw the lens
        lensGroup
            .style("display", null)
            .attr(
            "transform",
            `translate(${width * 0.5}, ${height * 0.5})`
            );

        // Clone the part of the graph
        lensContent.selectAll("*").remove();
        const clone = radarGroup.node().cloneNode(true);
        clone.removeAttribute("transform");
        lensContent.node().appendChild(clone);

        // Draw the magnification
        const scaleFactor = 7;
        d3.select(clone)
            .attr(
            "transform",
            `translate(${-localX * scaleFactor}, ${-localY * scaleFactor}) scale(${scaleFactor})`
            );
    }

    // Instruction Box
    const instructionBox = svg.append("foreignObject")
        .attr("x", width * 0.75 - 100)
        .attr("y", height * 0.75 - radius - 60)
        .attr("width", 200)
        .attr("height", 40)
        .attr("class", "instruction-box")
        .append("xhtml:div")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("border-radius", "8px")
        .style("padding", "6px")
        .style("font-size", "12px")
        .style("text-align", "center")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
        .style("pointer-events", "none")
        .text("Mouse over the Star Chart.");

    // Hide the instructions after the user has interacted, and 10 seconds have passed
    function tryHideInstruction() {
        if (hasMagnified && hasWaitedTenSeconds) {
            instructionBox.transition().duration(500).style("opacity", 0).remove();
        }
    }
    setTimeout(() => {
        hasWaitedTenSeconds = true;
        tryHideInstruction();
    }, 10000);

}

// Function to draw the Sankey
function drawSankeyChart(rawData) {
    // Basic setup
    const effects = ["Improve", "No effect", "Worsen"];
    const genreEffectCounts = {};
    const effectColors = {
        "Improve": "#00aa00",
        "No effect": "#ab8400",
        "Worsen": "#ff0000"
    };

    // Pull in data
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

    // Setting up data structure for the sankey
    const nodes = [];
    const nodeMap = new Map();
    let nodeIndex = 0;

    // Get the nodes
    function getNode(name) {
        if (!nodeMap.has(name)) {
            nodeMap.set(name, nodeIndex++);
            nodes.push({ name });
        }
        return nodeMap.get(name);
    }

    // Calculate the links
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

    // Create the sankey layout
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[width * 0.05, height * 0.05], [width * 0.95, height * 0.5]]);
    const sankeyData = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // Graph title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height * 0.03)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("How Do Different Music Genres Effect the Mood of Patients?")

    // Create the sankey
    const sankeyGroup = svg.append("g")
        .attr("class", "sankey");

    // Positioning the columns
    const genreX = d3.min(sankeyData.nodes.filter(d => !effects.includes(d.name)), d => d.x0);
    const effectX = d3.min(sankeyData.nodes.filter(d => effects.includes(d.name)), d => d.x0);

    // Add group labels
    sankeyGroup.append("text")
        .attr("x", genreX - width * 0.01)
        .attr("y", height * 0.03)
        .attr("text-anchor", "center")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Favorite Genre");
    sankeyGroup.append("text")
        .attr("x", effectX - width * 0.07)
        .attr("y", height * 0.03)
        .attr("text-anchor", "center")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Effect of Music on Mood");

    // Draw the links between the nodes
    sankeyGroup.append("g")
        .selectAll("path")
        .data(sankeyData.links)
        .enter().append("path")
        .attr("class", "sankey-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => {
            const effectNode = sankeyData.nodes[d.target.index];
            return effectColors[effectNode.name] || "#999";
        })
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", d => Math.max(1, d.width));

    // Draw rectangles for the nodes
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
        .attr("stroke", "#000")

        // Function that highlights links connected to the node being moused over
        // And makes the other links more transparent
        .on("mouseenter", function(d) {
            const thisIndex = d.index;

            hasHovered = true;
            tryRemoveInstruction();
        
            d3.selectAll(".sankey-link")
                .attr("stroke-opacity", function(link) {
                    return (link.source.index === thisIndex || link.target.index === thisIndex) ? 1 : 0.1;
                });
        })
        // Resets to normal when mouse leaves
        .on("mouseleave", function() {
            d3.selectAll(".sankey-link")
                .attr("stroke-opacity", 0.5)
        });
        
    // Label each node
    node.append("text")
        .attr("x", d => d.x0 + width * 0.015)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .text(d => d.name)
        .filter(d => d.x0 < width / 2)
        .attr("x", d => d.x1 - width * 0.015)
        .attr("text-anchor", "end");


    // Instruction box
    const instructionGroup = svg.append("g")
        .attr("class", "instruction-group");
    const boxWidth = width * 0.125;
    const boxHeight = height * 0.04;
    const boxX = width * 0.07;
    const boxY = height * 0.12;

    // Draw instruction box
    instructionGroup.append("rect")
        .attr("x", boxX)
        .attr("y", boxY)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("rx", 6)
        .attr("ry", 6);

    // Instruction text
    instructionGroup.append("text")
        .attr("x", boxX + boxWidth / 2)
        .attr("y", boxY + boxHeight / 2 + 4)
        .attr("text-anchor", "middle")
        .style("font-size", Math.min(width, height) * 0.015)
        .style("fill", "black")
        .text("<== Mouse over the Sankey nodes");

    // Hide the box
    let hasHovered = false;
    let fiveSecondsPassed = false;

    function tryRemoveInstruction() {
        if (hasHovered && fiveSecondsPassed) {
            instructionGroup.transition().duration(500).style("opacity", 0).remove();
        }
    }
    setTimeout(() => {
        fiveSecondsPassed = true;
        tryRemoveInstruction();
    }, 10000);
}