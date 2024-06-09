let updateMap; //deklaracija funkcije updateMap

//učitavanje vise podataka istovremeno; približno • https://stackoverflow.com/questions/70629019/how-to-load-two-external-files-in-d3
Promise.all([
    d3.json("data/croData.json"),
    d3.json("data/cro.json")
]).then(function([data, data2]) {
    console.log(data);
    console.log(data2);

    //postavljanje margina i dimenzija za bar chart SVG
    var margin = {top: 45, bottom: 230, left: 85, right: 20};
    var width = 800 - margin.left - margin.right;
    var height = 700 - margin.top - margin.bottom;

    //kreiranje SVG-a
    var svg = d3.select("#barchart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top +")");
    
    //skaliranje X i Y osi
    var x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    var y = d3.scaleLinear()
        .range([height, 0]);

    var xAxis = d3.axisBottom(x);

    var yAxis = d3.axisLeft(y)
        .ticks(10);
    //dodavanje X osi na svg
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-90)");
    //dodavanje Y osi na svg
    svg.append("g")
        .attr("class", "y axis");

    //dodavanje naslova na X-os
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", (height + (margin.bottom / 2)))
        .attr("dy", "6.5em")
        .style("font-size", "1em")
        .style("text-anchor", "middle")
        .text("ŽUPANIJA");
    //dodavanje naslova na Y-os
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - (height / 2))
        .attr("y", 0 - margin.left)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("BROJ STANOVNIKA");

    //inicijalizacija varijabli za vrijednosti slidera i dropdowna
    var yearSlider = d3.select("#yearSlider");
    var yearValue = d3.select("#yearValue");
    var spolDropdown = d3.select("#spolDropdown");
    var zupanijaDropdown = d3.select("#zupanijaDropdown");

    //definiranje ponašanja kada se slider za godine pomakne
    yearSlider.on("input", function() {
        var year = this.value;
        yearValue.text(year);
        updateAll(year, spolDropdown.node().value, zupanijaDropdown.node().value);
    });
    //definiranje ponašanja kada se promijeni spol na padajucem izborniku
    spolDropdown.on("change", function() {
        updateAll(yearSlider.node().value, this.value, zupanijaDropdown.node().value);
    });
    //definiranje ponašanja kada se promijeni zupanija na padajucem izborniku
    zupanijaDropdown.on("change", function(){
        updateAll(yearSlider.node().value, spolDropdown.node().value, this.value);
    });

    //funkcija za azuriranje svih prikaza osjetljivih na promjenu godine, spola ili zupanije
    function updateAll(year, spol, zupanija) {
        updateChart(year, spol);
        updateMap(year);
        updatePiechart(year, zupanija)
    }
    //funkcija kojom se azurira stupcasti graf
    function updateChart(year, spol) {
        var filteredData = data.filter(d => d.Spol === spol && d.Godina == year); //filtriranje podataka

        //postavljanje vrijednosti labela na osima
        x.domain(filteredData.map(d => d.Zupanija));
        y.domain([0, d3.max(filteredData, function(d) { 
            return d.Procjena_stanovnistva; 
        })]);

        //kreiranje bar chart-a
        var bars = svg.selectAll(".bar")
            .data(filteredData, d => d.Zupanija);

        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.Zupanija))
            .attr("width", x.bandwidth())
            .attr("y", height)
            .attr("height", 0)
            .attr("fill", "#306382")
            .merge(bars)
            .transition()
            .duration(1000)
            .attr("y", d => y(d.Procjena_stanovnistva))
            .attr("height", d => height - y(d.Procjena_stanovnistva));

        bars.exit().transition()
            .duration(1000)
            .attr("y", height)
            .attr("height", 0)
            .remove();

        svg.select(".x.axis")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-90)");

        svg.select(".y.axis")
            .call(yAxis);
    }
    //dimenzije karte RH
    var mapWidth = 650;
    var mapHeight = 700;

    //skala boja za kartu
    var colorScale = d3.scaleLinear() 
        .domain([45000, 800000])
        .range([0, 6]); 

    var mapColors = ["#3e7fa8", "#377195", "#306382", "#2d5d7b", "#295570", "#22475d", "#1c384a"];  //boje za kartu RH

    //map projection
    var projection = d3.geoMercator();
    var path = d3.geoPath().projection(projection);

    //kreiranje SVG-a za kartu 
    var svgMap = d3.select("#croMap")
        .append("svg")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .style("border-radius", "1rem");
    //uvecanje i umanjenje karte (zoom)
    let zoom = d3.zoom()
        .scaleExtent([0.6, 4])
        .translateExtent([[0, 0], [mapWidth, mapHeight]])
        .on("zoom", handleZoom);

    var mapContainer = svgMap.append("g").call(zoom);
    
    var geoData = topojson.feature(data2, data2.objects.layer1);
    projection.fitSize([mapWidth, mapHeight], geoData);

    //update map funkcija za azuriranje karte, prima argument godinu odabranu na slideru
    updateMap = function(year) {
        var dataYear = `g${year}`; //zbog JSON podataka svaka godina je oznacena kao npr g2008 pa se na primljenu vrijednost mora dodati slovo g

        //kreiranje karte
        mapContainer.selectAll("path")
            .data(geoData.features)
            .join("path") 
            .attr("d", path)
            .style("fill", function(d) {
                var value = Math.round(colorScale(d.properties.population[dataYear]));
                return mapColors[value];
            })
            .style("stroke", "gray")
            .style("stroke-width", 1.5)
            .style("stroke-opacity", 1)
            //definiranje on-click funkcionalnosti na zupanijama
            .on("click", function(e, d) {
                d3.selectAll(".info").remove();
                var gustoca = d.properties.population[dataYear]/d.properties.area
                gustoca = Math.round((gustoca + Number.EPSILON)*100)/100;
                var infoDiv = d3.select("body")
                    .append("div")
                    .attr("class", "info")
                    .style("left", `${e.pageX}px`)
                    .style("top", `${e.pageY}px`)
                    .html(`
                        Informativni podaci za godinu ${year}:<br/>
                        Naziv županije: ${d.properties.name} <br/>
                        Sjedište: ${d.properties.capital} <br/>
                        Procjena broja stanovnika: ${d.properties.population[dataYear]} <br/>
                        Površina: ${d.properties.area} km² <br/>
                        Gustoća stanovništva: ${gustoca} st/km² <br/>
                    `);

                var selectedZupanija = d.properties.name;
                svg.selectAll(".bar")
                    .filter(bar => bar.Zupanija.includes(selectedZupanija))
                    .attr("fill", "#A41613"); 
                
                setTimeout(function() {
                    infoDiv.remove();
                    svg.selectAll(".bar")
                        .attr("fill", "#306382");
                }, 4000);
            });    
    }
    function handleZoom(e) {
        mapContainer.attr('transform', e.transform);
    }
    //popunjavanje polja zupanija i popunjavanje dropdowna iz tog polja
    var zupanije = Array.from(new Set(data.map(d => d.Zupanija)));
    zupanijaDropdown.selectAll("option")
        .data(zupanije)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);
    //velicina i radijus kruznog dijagrama
    var pieWidth = 500;
    var pieHeight = 500; 
    var radius = Math.min(pieWidth, pieHeight) / 2;

    //funkcija za azuriranje kruznog dijagrama, prima vrijednost godine i zupanije
    function updatePiechart(year, zupanija) {
        //filtriranje podataka
        var filteredData = data.filter(d => d.Godina == year && d.Zupanija === zupanija);
        var muskarciCount = d3.sum(filteredData.filter(d => d.Spol === "Muškarci"), d => d.Procjena_stanovnistva);
        var zeneCount = d3.sum(filteredData.filter(d => d.Spol === "Žene"), d => d.Procjena_stanovnistva);

        //dodavanje podataka za kruzni dijagram
        var pieData = [
            {label: "Muškarci", value: muskarciCount},
            {label: "Žene", value: zeneCount}
        ];
        //prvo uklanjanje prethodnog pie charta da bi se novi iscrtao
        d3.select("#piechart").select("svg").remove();

        //kreiranje kruznog dijagrama
        var svg = d3.select("#piechart")
            .append("svg")
            .attr("width", pieWidth)
            .attr("height", pieHeight)
            .append("g")
            .attr("transform", "translate(" + pieWidth / 2 + "," + pieHeight / 2 + ")");

        var pie = d3.pie()
            .value(d => d.value);

        var arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        var arcs = svg.selectAll("arc")
            .data(pie(pieData))
            .enter()
            .append("g")
            .attr("class", "arc");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", (d, i) => i === 0 ? "#306382" : "#A41613");

        arcs.append("text")
            .attr("transform", d => "translate(" + arc.centroid(d) + ")")
            .attr("dy", "0.35em")
            .style("text-anchor", "middle")
            .style("font-size", "2rem")
            .text(d => d.data.label);
    }
    
    //funkcija koja objedinjeno poziva azuriranje stupcastog i kruznog dijagrama te karte RH
    updateAll(2008, "Ukupno", zupanije[0]);
});


//ucitavanje podataka za za linijski graf
d3.json("data/prosjecnaPlaca.json").then(function(data3){
    data=data3;
    //definiranje velicine i margina za linijski graf
    var margin = {top: 50, bottom: 70, left: 80, right: 20};
    var width = 700 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    //dodavanje SVG-a
    var svg = d3.select("#linechart") 
    .append("svg") 
    .attr("width", width + margin.left + margin.right + 20) 
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); 

    //skaliranje x i y osi
    var x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.GODINA))
        .range([0, width]);
    var y = d3.scaleLinear()
        .domain([3000, 7000])
        .range([height, 0]);

    //X os
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    //Y os
    svg.append("g")
    .attr("class", "y axis")
        .call(d3.axisLeft(y));
    //labela za X-os
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", (height + (margin.bottom / 2)))
        .attr("dy", "1.2em")
        .style("font-size", "1.2em")
        .style("text-anchor", "middle")
        .text("Godina");
    //labela za Y-os
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - (height / 2))
        .attr("y", 0 - margin.left)
        .attr("dy", "1em")
        .style("font-size", "1.2em")
        .style("text-anchor", "middle")
        .text("Prosječna neto plaća");
    //dodavanje naslova iznad
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", -(margin.top / 2))
        .attr("font-weight", "bold")
        .style("font-size", "20px")
        .style("text-anchor", "middle")
        .text("Prosječna neto plaća svih radnika u RH");
    //kreiranje linijskog grafa
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#306382")
        .attr("stroke-width", 3)
        .attr("d", d3.line()
            .x(d => x(d.GODINA))
            .y(d => y(d.prosj_neto_placa)))
        .transition()
        .duration(1000);;
    //dodavanje crvene tocke za svaku godinu
    svg.selectAll("dot")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => x(d.GODINA))
        .attr("cy", d => y(d.prosj_neto_placa))
        .attr("r", 7)
        .attr("fill", "#B71815")
        //hover funkcionalnost na tockama
        .on("mouseover", function (e, d) {
            d3.selectAll(".info").remove();

            var infoDiv = d3.select("body")
                .append("div")
                .attr("class", "info")
                .style("left", `${e.pageX + 10}px`)
                .style("top", `${e.pageY + 10}px`)
                .html(`Prosječna plaća za ${d.GODINA}: ${d.prosj_neto_placa} kn`);
        })
        .on("mouseout", function(e,d){
            d3.selectAll(".info").remove();
        });
});