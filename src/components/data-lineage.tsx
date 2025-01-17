import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Wifi, 
  WifiOff, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Share2, 
  Info,
  ArrowUpRight,
  Database,
  AlertTriangle,
  Filter,
  Download,
  Maximize2,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { withErrorHandling } from '@/lib/error-handler';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Node {
  id: string;
  name: string;
  type: 'field' | 'related' | 'external' | 'system';
  group: number;
  impactScore?: number;
  systemType?: string;
  description?: string;
}

interface Link {
  source: string;
  target: string;
  type: 'direct' | 'indirect' | 'impact' | 'system';
  strength: number;
  description?: string;
}

interface DataLineageProps {
  dictionaryId: string;
}

export function DataLineage({ dictionaryId }: DataLineageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<{
    upstream: string[];
    downstream: string[];
  } | null>(null);
  const [viewMode, setViewMode] = useState<'default' | 'impact' | 'system'>('default');
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        await withErrorHandling(async () => {
          // Fetch direct relationships
          const { data: entries, error } = await supabase
            .from('dictionary_entries')
            .select(`
              id, 
              field_name,
              related_fields,
              data_type,
              description,
              impact_score
            `)
            .eq('dictionary_id', dictionaryId);

          if (error) throw error;

          // Fetch external systems and their connections
          const { data: systems } = await supabase
            .from('external_systems')
            .select('*')
            .eq('dictionary_id', dictionaryId);

          const nodes: Node[] = [];
          const links: Link[] = [];
          const nodeMap = new Map<string, boolean>();

          // Add field nodes
          entries?.forEach(entry => {
            if (!nodeMap.has(entry.id)) {
              nodes.push({
                id: entry.id,
                name: entry.field_name,
                type: 'field',
                group: 1,
                impactScore: entry.impact_score,
                description: entry.description
              });
              nodeMap.set(entry.id, true);
            }

            // Add direct relationships
            const relatedFields = entry.related_fields as string[];
            relatedFields?.forEach(relatedId => {
              if (!nodeMap.has(relatedId)) {
                const relatedEntry = entries.find(e => e.id === relatedId);
                if (relatedEntry) {
                  nodes.push({
                    id: relatedId,
                    name: relatedEntry.field_name,
                    type: 'related',
                    group: 2,
                    impactScore: relatedEntry.impact_score,
                    description: relatedEntry.description
                  });
                  nodeMap.set(relatedId, true);
                }
              }

              links.push({
                source: entry.id,
                target: relatedId,
                type: 'direct',
                strength: 1,
                description: 'Direct relationship'
              });
            });
          });

          // Add system nodes and connections
          systems?.forEach(system => {
            const systemNodeId = `system-${system.id}`;
            if (!nodeMap.has(systemNodeId)) {
              nodes.push({
                id: systemNodeId,
                name: system.name,
                type: 'system',
                group: 3,
                systemType: system.system_type,
                description: system.description
              });
              nodeMap.set(systemNodeId, true);
            }

            // Add system connections
            const connectedFields = system.connected_fields as string[];
            connectedFields?.forEach(fieldId => {
              links.push({
                source: systemNodeId,
                target: fieldId,
                type: 'system',
                strength: 0.7,
                description: `Connected to ${system.name}`
              });
            });
          });

          // Add indirect relationships based on system connections
          if (viewMode === 'impact') {
            const systemConnections = new Map<string, Set<string>>();
            
            // Build system connection map
            links.filter(l => l.type === 'system').forEach(link => {
              const fieldId = link.target;
              const systemId = link.source;
              
              if (!systemConnections.has(fieldId)) {
                systemConnections.set(fieldId, new Set());
              }
              systemConnections.get(fieldId)!.add(systemId);
            });

            // Add indirect links between fields connected to the same systems
            Array.from(systemConnections.entries()).forEach(([field1, systems1]) => {
              Array.from(systemConnections.entries()).forEach(([field2, systems2]) => {
                if (field1 !== field2) {
                  const commonSystems = new Set(
                    [...systems1].filter(x => systems2.has(x))
                  );
                  
                  if (commonSystems.size > 0) {
                    links.push({
                      source: field1,
                      target: field2,
                      type: 'indirect',
                      strength: 0.3,
                      description: `Indirect relationship through ${commonSystems.size} system(s)`
                    });
                  }
                }
              });
            });
          }

          setData({ nodes, links });
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dictionaryId, viewMode, toast]);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current);

    // Clear existing SVG
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg
      .attr('width', width)
      .attr('height', height)
      .call(zoomBehavior as any);

    // Create container for zoomable content
    const container = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Create arrow markers for different link types
    const markers = [
      { id: 'direct', color: '#666' },
      { id: 'indirect', color: '#999' },
      { id: 'impact', color: '#f59e0b' },
      { id: 'system', color: '#3b82f6' }
    ];

    svg.append('defs')
      .selectAll('marker')
      .data(markers)
      .enter()
      .append('marker')
      .attr('id', d => `arrow-${d.id}`)
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', d => d.color);

    // Filter links based on current view mode and filter
    const visibleLinks = data.links.filter(link => {
      if (filter !== 'all' && link.type !== filter) return false;
      if (viewMode === 'impact' && link.type === 'system') return false;
      if (viewMode === 'system' && link.type === 'indirect') return false;
      return true;
    });

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(visibleLinks)
      .join('line')
      .attr('stroke', d => {
        switch (d.type) {
          case 'direct': return '#666';
          case 'indirect': return '#999';
          case 'impact': return '#f59e0b';
          case 'system': return '#3b82f6';
          default: return '#666';
        }
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => d.strength * 2)
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', d.strength * 3);

        // Show tooltip
        const [x, y] = d3.pointer(event);
        container.append('text')
          .attr('class', 'tooltip')
          .attr('x', x)
          .attr('y', y - 10)
          .attr('text-anchor', 'middle')
          .attr('fill', 'currentColor')
          .text(d.description);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', d => d.strength * 2);
        
        container.selectAll('.tooltip').remove();
      });

    // Create nodes
    const node = container.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('click', (event: any, d: Node) => {
        event.stopPropagation();
        setSelectedNode(selectedNode?.id === d.id ? null : d);
        analyzeImpact(d.id);
      });

    // Add node circles with dynamic sizing and colors
    node.append('circle')
      .attr('r', d => {
        if (d.type === 'system') return 12;
        return d.impactScore ? 8 + (d.impactScore / 20) : 8;
      })
      .attr('fill', d => {
        if (d.type === 'system') return '#3b82f6';
        return d.impactScore && d.impactScore > 70 ? '#ef4444' :
               d.impactScore && d.impactScore > 40 ? '#f59e0b' :
               '#3b82f6';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add node labels
    node.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .text(d => d.name)
      .attr('font-size', '12px')
      .attr('fill', 'currentColor');

    // Add hover effect
    node
      .on('mouseover', function(event: any, d: Node) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', d.type === 'system' ? 14 : 
               d.impactScore ? 10 + (d.impactScore / 20) : 10);

        // Highlight connected nodes and links
        const connectedNodes = new Set<string>();
        visibleLinks.forEach(link => {
          if (link.source === d.id) connectedNodes.add(link.target);
          if (link.target === d.id) connectedNodes.add(link.source);
        });

        node.classed('opacity-50', n => 
          n.id !== d.id && !connectedNodes.has(n.id)
        );

        link.classed('opacity-50', l =>
          l.source !== d.id && l.target !== d.id
        );

        // Show tooltip
        const [x, y] = d3.pointer(event);
        container.append('text')
          .attr('class', 'tooltip')
          .attr('x', x)
          .attr('y', y - 20)
          .attr('text-anchor', 'middle')
          .attr('fill', 'currentColor')
          .text(d.description || d.name);
      })
      .on('mouseout', function() {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', d => d.type === 'system' ? 12 :
                         d.impactScore ? 8 + (d.impactScore / 20) : 8);

        node.classed('opacity-50', false);
        link.classed('opacity-50', false);
        container.selectAll('.tooltip').remove();
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Handle zoom controls
    const handleZoomIn = () => {
      svg.transition().duration(300).call(zoomBehavior.scaleBy as any, 1.5);
    };

    const handleZoomOut = () => {
      svg.transition().duration(300).call(zoomBehavior.scaleBy as any, 0.75);
    };

    const handleReset = () => {
      svg.transition().duration(300).call(zoomBehavior.transform as any, d3.zoomIdentity);
    };

    // Add event listeners for zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', handleZoomIn);
    document.getElementById('zoom-out')?.addEventListener('click', handleZoomOut);
    document.getElementById('reset-zoom')?.addEventListener('click', handleReset);

    return () => {
      simulation.stop();
      document.getElementById('zoom-in')?.removeEventListener('click', handleZoomIn);
      document.getElementById('zoom-out')?.removeEventListener('click', handleZoomOut);
      document.getElementById('reset-zoom')?.removeEventListener('click', handleReset);
    };
  }, [data, viewMode, filter]);

  const analyzeImpact = async (nodeId: string) => {
    try {
      const upstream: string[] = [];
      const downstream: string[] = [];

      // Analyze upstream dependencies
      const traverseUpstream = (id: string) => {
        data.links.forEach(link => {
          if (link.target === id && !upstream.includes(link.source)) {
            upstream.push(link.source);
            traverseUpstream(link.source);
          }
        });
      };

      // Analyze downstream dependencies
      const traverseDownstream = (id: string) => {
        data.links.forEach(link => {
          if (link.source === id && !downstream.includes(link.target)) {
            downstream.push(link.target);
            traverseDownstream(link.target);
          }
        });
      };

      traverseUpstream(nodeId);
      traverseDownstream(nodeId);

      setImpactAnalysis({ upstream, downstream });
    } catch (error) {
      console.error('Error analyzing impact:', error);
    }
  };

  const handleExport = () => {
    const svg = svgRef.current;
    if (!svg) return;

    // Create a copy of the SVG
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Convert to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'data-lineage.svg';
    link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    link.click();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading data lineage...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium">Data Lineage</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                Fields
              </Badge>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
                Systems
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-500">
                High Impact
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select view mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default View</SelectItem>
                <SelectItem value="impact">Impact Analysis</SelectItem>
                <SelectItem value="system">System View</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter connections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Connections</SelectItem>
                <SelectItem value="direct">Direct Only</SelectItem>
                <SelectItem value="indirect">Indirect Only</SelectItem>
                <SelectItem value="system">System Only</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                id="zoom-in"
                variant="outline"
                size="icon"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                id="zoom-out"
                variant="outline"
                size="icon"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                id="reset-zoom"
                variant="outline"
                size="icon"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Export Graph"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Full Screen"
                onClick={() => {
                  const elem = svgRef.current?.parentElement;
                  if (elem?.requestFullscreen) {
                    elem.requestFullscreen();
                  }
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative border rounded-lg overflow-hidden bg-background">
          <svg 
            ref={svgRef} 
            className="w-full touch-none"
            style={{ minHeight: '600px' }}
          />
          
          {selectedNode && (
            <div className="absolute bottom-4 right-4 w-80 bg-card p-4 rounded-lg shadow-lg border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium">{selectedNode.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedNode.type === 'system' ? 'External System' : 'Field'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedNode(null)}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>

              {selectedNode.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedNode.description}
                </p>
              )}

              {impactAnalysis && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Impact Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Upstream Dependencies:</span>{' '}
                        {impactAnalysis.upstream.length}
                      </p>
                      <p>
                        <span className="font-medium">Downstream Impact:</span>{' '}
                        {impactAnalysis.downstream.length}
                      </p>
                    </div>
                  </div>

                  {selectedNode.impactScore !== undefined && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Impact Score
                      </h5>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              selectedNode.impactScore > 70 ? 'bg-red-500' :
                              selectedNode.impactScore > 40 ? 'bg-orange-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${selectedNode.impactScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {selectedNode.impactScore}%
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'system' && selectedNode.systemType && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        System Type
                      </h5>
                      <Badge variant="secondary">
                        {selectedNode.systemType}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}