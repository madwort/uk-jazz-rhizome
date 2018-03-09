var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

// horrible globvar but will do until the inevitable refactoring...
var links = null;
var highlight_target_id = "";

// var color = d3.scaleOrdinal(d3.schemeCategory10);
function color(type) {
  switch (type) {
  case "person":
    return "#f8efc6";
    break;
  case "group":
    return "#e7eef6";
    break;
  case "organisation":
    return "#cae9e3";
    break;
  default:
    return "#000";
  }
}

function size(type) {
  switch (type) {
  case "person":
    return "10";
    break;
  default:
    return "18";
  }
}

function title(str) {
  return str.replace(/\b\S/g, function(t) { return t.toUpperCase() });
}

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(50).iterations(5))
    .force("charge", d3.forceManyBody().strength(-50.5))
    .force("center", d3.forceCenter(width / 2, height / 2));


d3.json("rhizome-json.php", function(error, graph) {
  if (error) throw error;
  var memberLinks = graph.links.memberOf;
  var alumLinks = graph.links.alumOf;

  links = d3.merge([memberLinks, alumLinks]);

  var link = svg.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter().append("line")
      .attr("stroke-width", function(d) { return Math.sqrt(d.value); })
      .style("stroke-dasharray", function(d) {
        if(d.type=="alum") return ("3, 3");
      });

  var node = svg.append("g")
      .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter()
      .append("g")
      .attr("class", "node")
      .append("circle")
      .attr("r", function(d) {
        return size(d.type);
      })
      .attr("fill", function(d) { 
        return color(d.type);
      })
      .attr('id', function(d){
              return 'node-'+d.id;
            })
      .on("mouseover", handleMouseOver)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

  var nodeText = svg.selectAll(".node")
    .append("text")
    .data(graph.nodes)
    .text(function(d) {
      return d.name;
    })
    .attr("x", function(d) {
      return (d.x); })
    .attr("y", function(d) {
      return (d.y); })
    .attr("dy", ".25em")
    .attr("text-anchor", "middle")
    .attr('id', function(d){
            return 'text-'+d.id;
          })
    .on("mouseover", handleMouseOver)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended)
    );

  node.append("title")
      .text(function(d) { return d.id; });

  simulation
      .nodes(graph.nodes)
      .on("tick", ticked);

  simulation.force("link")
      .links(links);

 function ticked() {
    var svg_width = 1000;
    var svg_height = 1000;

    node
        .attr('fx', function(d){
          if (d.id == highlight_target_id) { 
            console.log(d.id);
            return 1; 
          } else {
            return null;
          }
        })
        .attr("cx", function(d) { 
          radius = size(d.type);
          return d.x = Math.max(radius, Math.min(svg_width - radius, d.x)); 
         })
        .attr('fy', function(d){
           if (d.id == highlight_target_id) { return 1; } else {
             return null;
           }
         })
        .attr("cy", function(d) { 
          radius = size(d.type);
          return d.y = Math.max(radius, Math.min(svg_height - radius, d.y)); 
        });

    nodeText
        .attr("x", function(d) { 
          radius = size(d.type);
          return d.x = Math.max(radius, Math.min(svg_width - radius, d.x)); 
         })
        .attr("y", function(d) { 
          radius = size(d.type);
          return d.y = Math.max(radius, Math.min(svg_height - radius, d.y)); 
        });

    link
        .attr("x1", function(d) { 
          if (d.source.fx != null) {return d.source.fx;};
          return d.source.x; 
        })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { 
          if (d.target.fx != null) {return d.target.fx;};
          return d.target.x; 
        })
        .attr("y2", function(d) { return d.target.y; });

  }

});

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function handleMouseOver(d) {
  d3.select('#info').remove();

  // Build #info with metadata from object
  var info = d3.select('#metadata').append('div').attr("id", "info");
  var list = info.append('ul');
  list.append('li').text(title(d.type + ":"));
  list.append('li').text(d.name);
  
  list.append('li').append('a').attr('href', d.url).text(d.url);
}

function allNodesOpacity(fill_opacity = 1) {
  d3.selectAll('circle').style('fill-opacity', fill_opacity);
  d3.selectAll('text').style('fill-opacity', fill_opacity);
  d3.selectAll('g.node')
    .each(function(d){
      d.fx = null; d.fy = null;
    })
}

function idNodeOpacity(id, fill_opacity = 1) {
  d3.selectAll('#node-'+id).style('fill-opacity', fill_opacity);
  d3.selectAll('#text-'+id).style('fill-opacity', fill_opacity);
}

function highlightNode(target_id) {
  // make all nodes nearly transparent
  allNodesOpacity(0.2);

  d3.selectAll('g.node')
    .each(function(d){
      if(d.id == target_id) { 
        d.fx = width / 2; d.fy = height / 2; 
      }
    })

  highlight_target_id = target_id;

  var second_degree_nodes = [];

  links.filter(function(d) {
    return ((d.source.id == target_id) || (d.target.id == target_id));
  }).forEach(function(d){
    if (d.source.type == "group") {
      second_degree_nodes.push(d.source.id);
    }
    if (d.target.type == "group") {
      second_degree_nodes.push(d.target.id);
    }
    idNodeOpacity(d.source.id);
    idNodeOpacity(d.target.id);
  });

  second_degree_nodes.forEach(function(n){
    links.filter(function(d) {
      return ((d.source.id == n) || (d.target.id == n));
    }).forEach(function(d){
      idNodeOpacity(d.source.id);
      idNodeOpacity(d.target.id);
    });
  });
}