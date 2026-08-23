import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { HostelDormitory } from '../../types';
import { Users, Bed, Building, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BoardingHouseD3DashboardProps {
  dormitories: HostelDormitory[];
  onSelectDorm?: (dorm: HostelDormitory) => void;
}

export const BoardingHouseD3Dashboard: React.FC<BoardingHouseD3DashboardProps> = ({
  dormitories,
  onSelectDorm
}) => {
  const donutChartRef = useRef<SVGSVGElement | null>(null);
  const barChartRef = useRef<SVGSVGElement | null>(null);
  const [selectedDormId, setSelectedDormId] = useState<string>('all');

  const totalCapacity = dormitories.reduce((acc, d) => acc + d.totalCapacity, 0);
  const totalOccupied = dormitories.reduce((acc, d) => acc + d.occupiedCount, 0);
  const totalAvailable = totalCapacity - totalOccupied;
  const overallOccupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // D3 Donut Chart: Occupancy Overview
  useEffect(() => {
    if (!donutChartRef.current) return;

    const svg = d3.select(donutChartRef.current);
    svg.selectAll('*').remove();

    const width = 240;
    const height = 240;
    const margin = 10;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.68;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const data = [
      { label: 'Occupied Beds', value: totalOccupied, color: '#3b82f6' },
      { label: 'Available Beds', value: totalAvailable, color: '#10b981' }
    ];

    const pie = d3.pie<{ label: string; value: number; color: string }>()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.04);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc as any)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .transition()
      .duration(750)
      .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(i(t) as any) || '';
        };
      });

    // Central text for percentage
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('font-size', '26px')
      .attr('font-weight', '800')
      .attr('fill', '#f8fafc')
      .text(`${overallOccupancyRate}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#94a3b8')
      .text('OCCUPIED');

  }, [dormitories, totalOccupied, totalAvailable, overallOccupancyRate]);

  // D3 Grouped Bar Chart: Capacity vs Occupied per Dormitory
  useEffect(() => {
    if (!barChartRef.current) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll('*').remove();

    const width = 440;
    const height = 240;
    const margin = { top: 20, right: 20, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    interface DormChartItem {
      name: string;
      fullName: string;
      occupied: number;
      available: number;
      capacity: number;
      color: string;
    }

    const dormData: DormChartItem[] = dormitories.map(d => ({
      name: d.name.split('(')[0].replace('Hall', '').replace('House', '').trim(),
      fullName: d.name,
      occupied: d.occupiedCount,
      available: d.availableBeds,
      capacity: d.totalCapacity,
      color: d.colorHex || '#6366f1'
    }));

    const x0 = d3.scaleBand()
      .domain(dormData.map(d => d.name))
      .rangeRound([0, innerWidth])
      .paddingInner(0.25);

    const x1 = d3.scaleBand()
      .domain(['occupied', 'available'])
      .rangeRound([0, x0.bandwidth()])
      .padding(0.08);

    const maxVal = d3.max(dormData, (d: DormChartItem) => Math.max(d.occupied, d.available)) || 180;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.15])
      .nice()
      .rangeRound([innerHeight, 0]);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x0))
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .attr('font-weight', '600');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8');

    // Remove axis domain lines
    g.selectAll('.domain').attr('stroke', '#334155');
    g.selectAll('.tick line').attr('stroke', '#1e293b');

    // Dormitory Group Bars
    const dormGroups = g.selectAll('.dorm-group')
      .data(dormData)
      .enter()
      .append('g')
      .attr('class', 'dorm-group')
      .attr('transform', (d: DormChartItem) => `translate(${x0(d.name)},0)`);

    // Occupied bar
    dormGroups.append('rect')
      .attr('x', () => x1('occupied') || 0)
      .attr('y', (d: DormChartItem) => y(d.occupied))
      .attr('width', x1.bandwidth())
      .attr('height', (d: DormChartItem) => innerHeight - y(d.occupied))
      .attr('fill', (d: DormChartItem) => d.color)
      .attr('rx', 4)
      .style('cursor', 'pointer');

    // Available bar
    dormGroups.append('rect')
      .attr('x', () => x1('available') || 0)
      .attr('y', (d: DormChartItem) => y(d.available))
      .attr('width', x1.bandwidth())
      .attr('height', (d: DormChartItem) => innerHeight - y(d.available))
      .attr('fill', '#10b981')
      .attr('opacity', 0.8)
      .attr('rx', 4)
      .style('cursor', 'pointer');

    // Text labels on bars
    dormGroups.append('text')
      .attr('x', () => (x1('occupied') || 0) + x1.bandwidth() / 2)
      .attr('y', (d: DormChartItem) => y(d.occupied) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', '#e2e8f0')
      .text((d: DormChartItem) => d.occupied);

    dormGroups.append('text')
      .attr('x', () => (x1('available') || 0) + x1.bandwidth() / 2)
      .attr('y', (d: DormChartItem) => y(d.available) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', '#34d399')
      .text((d: DormChartItem) => d.available);

  }, [dormitories]);

  return (
    <div className="space-y-6">
      {/* Top metrics ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Bed Capacity</span>
            <Building className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalCapacity}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{dormitories.length} Active Halls</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
            <span>Occupied Beds</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-300 mt-1">{totalOccupied}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{overallOccupancyRate}% Total Occupancy</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Available Vacant Beds</span>
            <Bed className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{totalAvailable}</div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5">Ready for Placement</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-purple-400 font-medium">
            <span>Hostel Health Status</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1">Optimal</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Zero Unaccounted Boarders</div>
        </div>
      </div>

      {/* D3 Visualizations Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Occupancy Rate Donut */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-between shadow-sm">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Occupancy Proportion
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">D3.js Donut</span>
          </div>

          <div className="w-full flex justify-center my-2">
            <svg ref={donutChartRef} className="w-48 h-48 drop-shadow-md" />
          </div>

          <div className="w-full grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-800">
            <div className="p-2 rounded-xl bg-blue-950/30 border border-blue-800/40">
              <div className="text-[10px] text-blue-400 font-bold">Occupied</div>
              <div className="text-sm font-black text-white">{totalOccupied} Beds</div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
              <div className="text-[10px] text-emerald-400 font-bold">Vacant</div>
              <div className="text-sm font-black text-white">{totalAvailable} Beds</div>
            </div>
          </div>
        </div>

        {/* Right: Hall by Hall Grouped Bars */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Bed Allocation by Dormitory Hall
              </h3>
              <p className="text-[11px] text-slate-400">Real-time breakdown of occupied vs available beds per house</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Occupied
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Vacant Beds
              </span>
            </div>
          </div>

          <div className="w-full flex justify-center overflow-x-auto py-2">
            <svg ref={barChartRef} className="w-full max-w-lg h-56" />
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Refreshes dynamically with exeat check-outs & room re-assignments</span>
            <span className="text-emerald-400 font-medium">Synced with Gate Kiosk & Sick Bay</span>
          </div>
        </div>
      </div>

      {/* Hall Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {dormitories.map(dorm => {
          const isSelected = selectedDormId === dorm.id;
          return (
            <div
              key={dorm.id}
              onClick={() => {
                setSelectedDormId(dorm.id);
                if (onSelectDorm) onSelectDorm(dorm);
              }}
              className={`p-4 rounded-2xl bg-slate-900 border transition-all cursor-pointer hover:border-slate-700 ${
                isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    dorm.gender === 'Boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                  }`}>
                    {dorm.gender} • {dorm.category}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1.5">{dorm.name}</h4>
                </div>
                <div 
                  className="w-3.5 h-3.5 rounded-full" 
                  style={{ backgroundColor: dorm.colorHex || '#6366f1' }}
                />
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Occupancy</span>
                  <span className="font-bold text-white">{dorm.occupancyRatePercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${dorm.occupancyRatePercent}%`,
                      backgroundColor: dorm.occupancyRatePercent > 95 ? '#ef4444' : (dorm.colorHex || '#3b82f6')
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                <span>{dorm.occupiedCount} / {dorm.totalCapacity} Beds</span>
                <span className="text-emerald-400 font-bold">{dorm.availableBeds} Vacant</span>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 truncate">
                House Master: <strong className="text-slate-200">{dorm.houseMasterName}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
