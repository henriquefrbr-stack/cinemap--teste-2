import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import * as d3 from "d3";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NetworkPage = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef();
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetworkData(movieId);
  }, [movieId]);

  const fetchNetworkData = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/movies/${id}/network`);
      setNetworkData(response.data);
    } catch (error) {
      console.error("Error fetching network data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (networkData && !loading) {
      createNetworkVisualization();
    }
  }, [networkData, loading]);

  const createNetworkVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create nodes and links data
    const centralNode = {
      id: networkData.central_movie.id,
      title: networkData.central_movie.title,
      poster_url: networkData.central_movie.poster_url,
      type: "central",
      x: width / 2,
      y: height / 2,
      fx: width / 2, // Fixed position for central node
      fy: height / 2
    };

    const relatedNodes = networkData.related_movies.map((movie, index) => {
      const angle = (index / networkData.related_movies.length) * 2 * Math.PI;
      const radius = 250;
      return {
        id: movie.id,
        title: movie.title,
        poster_url: movie.poster_url,
        type: "related",
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius
      };
    });

    const nodes = [centralNode, ...relatedNodes];
    const links = relatedNodes.map(node => ({
      source: centralNode.id,
      target: node.id
    }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(250))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const container = svg.append("g");

    // Create links
    const link = container.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "network-link")
      .style("stroke", "rgba(255, 255, 255, 0.3)")
      .style("stroke-width", 2);

    // Create node groups
    const node = container.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", d => `network-node ${d.type}-node`)
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add movie circles with gradients (fallback if poster fails)
    node.append("circle")
      .attr("r", d => d.type === "central" ? 60 : 45)
      .attr("class", "network-node-image")
      .style("fill", d => {
        // Use gradient colors as base
        return d.type === "central" ? "#ff6b6b" : "#4ecdc4";
      })
      .style("stroke", d => d.type === "central" ? "#ff6b6b" : "#4ecdc4")
      .style("stroke-width", d => d.type === "central" ? 4 : 2)
      .style("filter", d => 
        d.type === "central" 
          ? "drop-shadow(0 0 20px rgba(255, 107, 107, 0.6))"
          : "drop-shadow(0 0 10px rgba(78, 205, 196, 0.4))"
      );

    // Add movie titles
    node.append("text")
      .attr("class", "network-node-text")
      .attr("dy", 5)
      .style("fill", "white")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", d => d.type === "central" ? "16px" : "13px")
      .style("font-weight", "700")
      .style("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 15px rgba(0, 0, 0, 0.9)")
      .each(function(d) {
        const text = d3.select(this);
        const words = d.title.split(' ');
        const maxCharsPerLine = d.type === "central" ? 10 : 8;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const dy = d.type === "central" ? -10 : -5;
        
        text.text(null);
        
        words.forEach(word => {
          line.push(word);
          const testLine = line.join(' ');
          if (testLine.length > maxCharsPerLine && line.length > 1) {
            line.pop();
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', lineNumber === 0 ? dy : lineHeight + 'em')
              .text(line.join(' '));
            line = [word];
            lineNumber++;
          }
        });
        
        if (line.length > 0) {
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', lineNumber === 0 ? dy : lineHeight + 'em')
            .text(line.join(' '));
        }
      });

    // Add subtitle with movie rating
    node.append("text")
      .attr("class", "network-node-subtitle")
      .attr("dy", d => d.type === "central" ? 45 : 35)
      .style("fill", "rgba(255, 255, 255, 0.8)")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", d => d.type === "central" ? "12px" : "10px")
      .style("font-weight", "400")
      .style("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 10px rgba(0, 0, 0, 0.8)")
      .text(d => {
        // Get the movie data to show rating
        const movieData = d.type === "central" ? networkData.central_movie : 
          networkData.related_movies.find(m => m.id === d.id);
        return movieData ? `★ ${movieData.vote_average.toFixed(1)}` : '';
      });

    // Add click handler for nodes
    node.on("click", (event, d) => {
      if (d.type === "related") {
        // Smooth transition to new movie
        const transition = d3.transition().duration(1000);
        
        // Fade out current network
        container.transition(transition)
          .style("opacity", 0)
          .on("end", () => {
            // Navigate to new movie
            navigate(`/network/${d.id}`, { replace: true });
          });
      }
    });

    // Hover effects
    node.on("mouseenter", function(event, d) {
      if (d.type === "related") {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 55)
          .style("filter", "drop-shadow(0 0 25px rgba(78, 205, 196, 0.9)) brightness(1.3)");
        
        d3.select(this).selectAll("text")
          .transition()
          .duration(200)
          .style("font-weight", "800");
      }
    })
    .on("mouseleave", function(event, d) {
      if (d.type === "related") {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 45)
          .style("filter", "drop-shadow(0 0 10px rgba(78, 205, 196, 0.4))");
        
        d3.select(this).selectAll("text")
          .transition()
          .duration(200)
          .style("font-weight", d.type === "central" ? "700" : "700");
      }
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.type !== "central") {
        d.fx = null;
        d.fy = null;
      }
    }

    // Entrance animation
    container.style("opacity", 0)
      .transition()
      .duration(1500)
      .style("opacity", 1);

    // Animate nodes entrance
    node.style("opacity", 0)
      .transition()
      .delay((d, i) => i * 200)
      .duration(800)
      .style("opacity", 1)
      .style("transform", "scale(1)");

    // Initial zoom to fit content - do this after a delay to ensure nodes are positioned
    setTimeout(() => {
      const bounds = container.node().getBBox();
      const fullWidth = bounds.width;
      const fullHeight = bounds.height;
      const widthRatio = (width * 0.8) / fullWidth;
      const heightRatio = (height * 0.8) / fullHeight;
      const scale = Math.min(widthRatio, heightRatio, 1);
      
      if (fullWidth > 0 && fullHeight > 0) {
        svg.transition()
          .duration(1000)
          .call(zoom.transform, d3.zoomIdentity
            .translate((width - fullWidth * scale) / 2 - bounds.x * scale, 
                      (height - fullHeight * scale) / 2 - bounds.y * scale)
            .scale(scale));
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="network-container">
        <div className="network-header">
          <button onClick={() => navigate("/")} className="back-button">
            ← Back to Search
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="network-container">
      <div className="network-header">
        <button onClick={() => navigate("/")} className="back-button">
          ← Back to Search
        </button>
        {networkData && (
          <h2 style={{ color: "white", margin: "0 2rem", fontSize: "1.2rem" }}>
            Movie Network: {networkData.central_movie.title}
          </h2>
        )}
      </div>
      <div className="network-visualization">
        <svg
          ref={svgRef}
          className="network-svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        />
      </div>
    </div>
  );
};

export default NetworkPage;