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
      console.error("Erro ao buscar dados da rede:", error);
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

    // Criar dados dos nós e links
    const centralNode = {
      id: networkData.central_movie.id,
      title: networkData.central_movie.title,
      poster_url: networkData.central_movie.poster_url,
      vote_average: networkData.central_movie.vote_average,
      type: "central"
    };

    const relatedNodes = networkData.related_movies.map((movie, index) => {
      // Posicionar os nós relacionados em círculo ao redor do central
      const angle = (index / networkData.related_movies.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.25; // 25% da menor dimensão da tela
      
      return {
        id: movie.id,
        title: movie.title,
        poster_url: movie.poster_url,
        vote_average: movie.vote_average,
        type: "related",
        // Posições iniciais fixas em círculo
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        fx: width / 2 + Math.cos(angle) * radius, // Fixar posição inicial
        fy: height / 2 + Math.sin(angle) * radius
      };
    });

    // Definir posição fixa do nó central
    centralNode.x = width / 2;
    centralNode.y = height / 2;
    centralNode.fx = width / 2;
    centralNode.fy = height / 2;

    const nodes = [centralNode, ...relatedNodes];
    const links = relatedNodes.map(node => ({
      source: centralNode.id,
      target: node.id
    }));

    // Criar simulação de força mais controlada para cartazes
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(Math.min(width, height) * 0.28).strength(0.7))
      .force("charge", d3.forceManyBody().strength(-1000)) // Força repulsiva mais forte para cartazes
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => d.type === "central" ? 90 : 70)) // Maior raio para cartazes
      .force("radial", d3.forceRadial(Math.min(width, height) * 0.28, width / 2, height / 2).strength(0.4))
      .alpha(0.4) // Reduzir movimento inicial
      .alphaDecay(0.015); // Desaceleração mais suave

    // Comportamento de zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 2])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const container = svg.append("g");

    // Criar links
    const link = container.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "network-link")
      .style("stroke", "rgba(255, 255, 255, 0.4)")
      .style("stroke-width", 3)
      .style("opacity", 0.8);

    // Criar definições para padrões de imagens
    const defs = svg.append("defs");
    
    // Criar padrões para cartazes dos filmes
    nodes.forEach(d => {
      if (d.poster_url) {
        const pattern = defs.append("pattern")
          .attr("id", `poster-pattern-${d.id}`)
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 1)
          .attr("height", 1)
          .attr("patternContentUnits", "objectBoundingBox");

        pattern.append("image")
          .attr("href", d.poster_url)
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 1)
          .attr("height", 1)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .on("error", function() {
            // Se a imagem falhar, remove o padrão
            d3.select(`#poster-pattern-${d.id}`).remove();
          });
      }
    });

    // Criar tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "movie-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "14px")
      .style("max-width", "300px")
      .style("z-index", "1000")
      .style("backdrop-filter", "blur(10px)")
      .style("border", "1px solid rgba(255, 255, 255, 0.2)")
      .style("box-shadow", "0 10px 30px rgba(0, 0, 0, 0.5)");

    // Criar grupos de nós
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

    // Adicionar círculos/retângulos dos filmes
    node.append("rect")
      .attr("width", d => d.type === "central" ? 120 : 90)
      .attr("height", d => d.type === "central" ? 180 : 135)
      .attr("x", d => d.type === "central" ? -60 : -45)
      .attr("y", d => d.type === "central" ? -90 : -67.5)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("class", "network-node-poster")
      .style("fill", d => {
        // Usar cartaz se disponível, senão usar cor sólida
        return d.poster_url ? `url(#poster-pattern-${d.id})` : 
               (d.type === "central" ? "#ff4757" : "#2ed573");
      })
      .style("stroke", d => d.type === "central" ? "#ff3742" : "#20bf6b")
      .style("stroke-width", d => d.type === "central" ? 4 : 3)
      .style("filter", d => 
        d.type === "central" 
          ? "drop-shadow(0 0 25px rgba(255, 71, 87, 0.7))"
          : "drop-shadow(0 0 15px rgba(46, 213, 115, 0.5))"
      )
      .style("opacity", 0.95);

    // Adicionar overlay para filmes sem cartaz (para mostrar ícone de filme)
    node.filter(d => !d.poster_url)
      .append("text")
      .attr("dy", 5)
      .style("fill", "white")
      .style("font-size", d => d.type === "central" ? "40px" : "30px")
      .style("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("opacity", 0.8)
      .text("🎬");

    // Adicionar títulos dos filmes (abaixo do cartaz)
    node.append("text")
      .attr("class", "network-node-text")
      .attr("dy", d => d.type === "central" ? 105 : 85)
      .style("fill", "white")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", d => d.type === "central" ? "14px" : "12px")
      .style("font-weight", "700")
      .style("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 10px rgba(0, 0, 0, 0.8)")
      .each(function(d) {
        const text = d3.select(this);
        const words = d.title.split(' ');
        const maxCharsPerLine = d.type === "central" ? 16 : 12;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        
        text.text(null);
        
        words.forEach(word => {
          line.push(word);
          const testLine = line.join(' ');
          if (testLine.length > maxCharsPerLine && line.length > 1) {
            line.pop();
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', lineNumber === 0 ? 0 : lineHeight + 'em')
              .text(line.join(' '));
            line = [word];
            lineNumber++;
          }
        });
        
        if (line.length > 0) {
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', lineNumber === 0 ? 0 : lineHeight + 'em')
            .text(line.join(' '));
        }
      });

    // Adicionar avaliações (abaixo do título)
    node.append("text")
      .attr("class", "network-node-rating")
      .attr("dy", d => d.type === "central" ? 135 : 110)
      .style("fill", "#FFD700")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", d => d.type === "central" ? "13px" : "11px")
      .style("font-weight", "600")
      .style("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 8px rgba(0, 0, 0, 0.8)")
      .text(d => `★ ${d.vote_average?.toFixed(1) || 'N/A'}`);

    // Manipuladores de clique
    node.on("click", (event, d) => {
      if (d.type === "related") {
        // Transição suave para novo filme
        const transition = d3.transition().duration(1000);
        
        container.transition(transition)
          .style("opacity", 0)
          .on("end", () => {
            navigate(`/network/${d.id}`, { replace: true });
          });
      }
    });

    // Efeitos de hover com tooltip
    node.on("mouseenter", function(event, d) {
      // Mostrar tooltip com sinopse
      const movieData = d.type === "central" ? networkData.central_movie : 
        networkData.related_movies.find(m => m.id === d.id);
      
      if (movieData && movieData.overview) {
        tooltip
          .style("visibility", "visible")
          .html(`
            <div style="font-weight: bold; margin-bottom: 8px; color: #FFD700;">
              ${movieData.title}
            </div>
            <div style="font-size: 12px; line-height: 1.4; color: rgba(255,255,255,0.9);">
              ${movieData.overview}
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: rgba(255,255,255,0.7);">
              Avaliação: ★ ${movieData.vote_average?.toFixed(1)} • ${movieData.release_date ? new Date(movieData.release_date).getFullYear() : 'N/A'}
            </div>
          `);
      }

      // Efeitos visuais de hover
      if (d.type === "related") {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("width", 105)
          .attr("height", 157.5)
          .attr("x", -52.5)
          .attr("y", -78.75)
          .style("filter", "drop-shadow(0 0 30px rgba(46, 213, 115, 0.9)) brightness(1.1)")
          .style("stroke-width", 4);
        
        d3.select(this).selectAll("text")
          .transition()
          .duration(200)
          .style("font-weight", "800");
      }
    })
    .on("mousemove", function(event) {
      // Mover tooltip com o mouse
      tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 15) + "px");
    })
    .on("mouseleave", function(event, d) {
      // Esconder tooltip
      tooltip.style("visibility", "hidden");

      // Reverter efeitos visuais
      if (d.type === "related") {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("width", 90)
          .attr("height", 135)
          .attr("x", -45)
          .attr("y", -67.5)
          .style("filter", "drop-shadow(0 0 15px rgba(46, 213, 115, 0.5))")
          .style("stroke-width", 3);
        
        d3.select(this).selectAll("text")
          .transition()
          .duration(200)
          .style("font-weight", "700");
      }
    });

    // Atualizar posições na simulação
    simulation.on("tick", () => {
      // Manter o nó central fixo
      centralNode.fx = width / 2;
      centralNode.fy = height / 2;

      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Funções de arrastar
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
      // Manter o nó central sempre fixo
      if (d.type === "central") {
        d.fx = width / 2;
        d.fy = height / 2;
      } else {
        // Permitir que nós relacionados se movam livremente após arrastar
        d.fx = null;
        d.fy = null;
      }
    }

    // Animação de entrada
    container.style("opacity", 0)
      .transition()
      .duration(1500)
      .style("opacity", 1);

    // Animar entrada dos nós
    node.style("opacity", 0)
      .transition()
      .delay((d, i) => i * 150)
      .duration(800)
      .style("opacity", 1);

    // Zoom inicial para ajustar conteúdo
    setTimeout(() => {
      const bounds = container.node().getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const widthRatio = (width * 0.7) / fullWidth;
        const heightRatio = (height * 0.7) / fullHeight;
        const scale = Math.min(widthRatio, heightRatio, 1);
        
        svg.transition()
          .duration(1000)
          .call(zoom.transform, d3.zoomIdentity
            .translate((width - fullWidth * scale) / 2 - bounds.x * scale, 
                      (height - fullHeight * scale) / 2 - bounds.y * scale)
            .scale(scale));
      }
    }, 1200);

    // Parar simulação após um tempo para economizar CPU
    setTimeout(() => {
      simulation.stop();
    }, 5000);

    // Cleanup tooltip quando componente desmonta
    return () => {
      d3.select(".movie-tooltip").remove();
    };
  };

  if (loading) {
    return (
      <div className="network-container">
        <div className="network-header">
          <button onClick={() => navigate("/")} className="back-button">
            ← Voltar à Pesquisa
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
          ← Voltar à Pesquisa
        </button>
        {networkData && (
          <h2 style={{ color: "white", margin: "0 2rem", fontSize: "1.2rem" }}>
            Rede do Filme: {networkData.central_movie.title}
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