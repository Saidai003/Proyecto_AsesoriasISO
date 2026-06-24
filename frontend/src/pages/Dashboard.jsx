import React, { useEffect, useMemo, useState } from 'react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { useAuth } from '../AuthContext'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// Common configuration for radar charts
const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    line: { borderWidth: 3, borderJoinStyle: 'round' },
    point: { radius: 6, hoverRadius: 8, backgroundColor: 'white', borderWidth: 3 },
  },
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 20,
        backdropColor: 'transparent',
        color: '#64748b',
        font: { size: 11, weight: '500' },
        showLabelBackdrop: false,
      },
      pointLabels: { font: { size: 13, weight: '600' }, color: '#1e293b', padding: 16 },
      grid: { color: '#e2e8f0', circular: true },
      angleLines: { color: '#e2e8f0', lineWidth: 1.5 },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '500' }, color: '#475569' },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
    },
  },
}

// --- Estilos reutilizables ---
const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '12px 14px',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

function KpiCard({ label, value, sublabel, valueColor = '#0f172a' }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'none' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: valueColor, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      {sublabel && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sublabel}</div>}
    </div>
  )
}

function MiniKpi({ label, value }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}

function ClauseButton({ num, active, onClick, porcentaje }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 6px',
        borderRadius: 8,
        border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
        background: active ? '#dbeafe' : '#fff',
        color: active ? '#1e40af' : '#334155',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: 13,
        transition: 'all .15s',
      }}
    >
      <div>Cláusula {num}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: active ? '#1e40af' : '#64748b' }}>{porcentaje}%</div>
    </button>
  )
}

export default function Dashboard({ endpoint, title = 'Dashboard' }) {
  const { token } = useAuth() || {}
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedClause, setSelectedClause] = useState(4)

  useEffect(() => {
    let abort = false
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!abort) setData(json)
      } catch (e) {
        if (!abort) setError(e.message)
      } finally {
        if (!abort) setLoading(false)
      }
    }
    fetchData()
    return () => { abort = true }
  }, [endpoint, token])

  // --- Métricas seguras frente a backend antiguo ---
  const metricas = data?.metricas || {
    cumplimiento_general: { porcentaje: 0, cumple: 0, total: 0 },
    brechas: { cantidad: 0 },
    proxima_auditoria: '—',
    tareas_pendientes: 0,
  }
  const kpisGlobales = data?.kpis_globales || data?.kpis || {
    promedio_resolucion: '0 días',
    eficiencia_proceso: '0%',
    csat: '0 / 5.0',
  }
  const graficoGlobal = data?.grafico_global || { labels: [], actual: [], meta: [] }
  const clausulas = data?.clausulas || []
  const kpisPorClausula = data?.kpis_por_clausula || {}

  const clauseData = useMemo(
    () => clausulas.find(c => Number(c.numero) === Number(selectedClause)),
    [clausulas, selectedClause]
  )

  const radarDataGlobal = {
    labels: graficoGlobal.labels,
    datasets: [
      {
        label: 'Actual (%)',
        data: graficoGlobal.actual,
        backgroundColor: 'rgba(37, 99, 235, 0.20)',
        borderColor: 'rgba(37, 99, 235, 1)',
      },
      {
        label: 'Meta (%)',
        data: graficoGlobal.meta,
        backgroundColor: 'rgba(148, 163, 184, 0.10)',
        borderColor: 'rgba(148, 163, 184, 0.7)',
        borderDash: [4, 4],
      },
    ],
  }

  const radarDataClausula = clauseData && clauseData.requisitos.length > 0
    ? {
        labels: clauseData.requisitos.map(r => r.codigo || r.descripcion?.slice(0, 12) || ''),
        datasets: [
          {
            label: `Actual (Cláusula ${selectedClause})`,
            data: clauseData.requisitos.map(r => r.porcentaje),
            backgroundColor: 'rgba(220, 38, 38, 0.20)',
            borderColor: 'rgba(220, 38, 38, 1)',
          },
          {
            label: 'Meta',
            data: clauseData.requisitos.map(_ => 100),
            backgroundColor: 'rgba(148, 163, 184, 0.10)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            borderDash: [4, 4],
          },
        ],
      }
    : null

  const clauseKpis = kpisPorClausula[selectedClause] || {
    promedio_resolucion: '0 días',
    eficiencia_proceso: '0%',
    csat: '0 / 5.0',
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Cargando dashboard…</div>
  }
  if (error) {
    return <div style={{ padding: 20, color: '#b91c1c' }}>Error: {error}</div>
  }

  const clausesList = [4, 5, 6, 7, 8, 9]

  return (
    <div style={{
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      height: '100vh',
      boxSizing: 'border-box',
      background: '#f1f5f9',
    }}>
      {/* === FILA 1: 4 KPIs principales === */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        flex: '0 0 auto',
      }}>
        <KpiCard
          label="Cumplimiento General"
          value={`${metricas.cumplimiento_general.porcentaje}%`}
          sublabel={`${metricas.cumplimiento_general.cumple} de ${metricas.cumplimiento_general.total} requisitos`}
          valueColor="#16a34a"
        />
        <KpiCard
          label="Brechas (No Cumple)"
          value={metricas.brechas.cantidad}
          sublabel="requisitos por atender"
          valueColor="#dc2626"
        />
        <KpiCard
          label="Próxima Auditoría"
          value={metricas.proxima_auditoria}
          valueColor="#2563eb"
        />
        <KpiCard
          label="Tareas Pendientes"
          value={metricas.tareas_pendientes}
        />
      </div>

      {/* === FILA 2: 35% KPIs apilados + 65% radar global === */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '35fr 65fr',
        gap: 12,
        flex: '1 1 0',
        minHeight: 0,
      }}>
        {/* Izquierda: 3 KPIs apilados */}
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 12, minHeight: 0 }}>
          <MiniKpi label="Promedio de Resolución" value={kpisGlobales.promedio_resolucion} />
          <MiniKpi label="Eficiencia de Proceso" value={kpisGlobales.eficiencia_proceso} />
          <MiniKpi label="Satisfacción (CSAT)" value={kpisGlobales.csat} />
        </div>

        {/* Derecha: Radar global (cláusulas 4-9) */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            Cumplimiento por Cláusula (4 – 9)
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <Radar data={radarDataGlobal} options={radarOptions} />
          </div>
        </div>
      </div>

      {/* === FILA 3: botones de cláusula + métricas + radar por cláusula === */}
      <div style={{
        ...card,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: '1 1 0',
        minHeight: 0,
      }}>
        {/* Botones de cláusula */}
        <div style={{ display: 'flex', gap: 8 }}>
          {clausesList.map(n => (
            <ClauseButton
              key={n}
              num={n}
              active={selectedClause === n}
              porcentaje={clausulas.find(c => Number(c.numero) === n)?.porcentaje ?? 0}
              onClick={() => setSelectedClause(n)}
            />
          ))}
        </div>

        {/* Contenido inferior: izquierda KPIs - derecha Radar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '35fr 65fr',
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 10, minHeight: 0 }}>
            <MiniKpi label="Promedio de Resolución" value={clauseKpis.promedio_resolucion} />
            <MiniKpi label="Eficiencia de Proceso" value={clauseKpis.eficiencia_proceso} />
            <MiniKpi label="Satisfacción (CSAT)" value={clauseKpis.csat} />
          </div>
          <div style={{ position: 'relative', minHeight: 0 }}>
            {radarDataClausula ? (
              <Radar data={radarDataClausula} options={radarOptions} />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#94a3b8',
                fontSize: 13,
              }}>
                Sin requisitos evaluados para la Cláusula {selectedClause}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}