import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { CHECKLIST_ITEMS, TIPOLOGIA_SERVIZIO, FAULT_TYPES, REQUEST_CHANNELS, WARRANTY_STATUS_OPTIONS } from '../../../lib/constants'

// ─── Styles ─────────────────────────────────────────────────────────────────
const c = {
  primary: '#1B4F72',
  accent: '#2E86C1',
  lightBlue: '#D6EAF8',
  border: '#C0C0C0',
  lightBorder: '#E0E0E0',
  bg: '#F8F9FA',
  text: '#2C3E50',
  lightText: '#7F8C8D',
  white: '#FFFFFF',
  check: '#27AE60',
}

const s = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: c.text,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottom: `1.5pt solid ${c.primary}`,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: c.primary,
  },
  companySubtitle: {
    fontSize: 6,
    color: c.accent,
    letterSpacing: 2,
  },
  headerRight: {
    textAlign: 'right',
    fontSize: 6,
    color: c.lightText,
    lineHeight: 1.5,
  },
  // ── Title bar ──
  titleBar: {
    backgroundColor: c.primary,
    padding: '4 8',
    marginBottom: 6,
    borderRadius: 2,
  },
  titleText: {
    color: c.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  // ── Sections ──
  sectionTitle: {
    backgroundColor: c.lightBlue,
    padding: '3 6',
    marginTop: 6,
    marginBottom: 3,
    borderLeft: `3pt solid ${c.accent}`,
  },
  sectionTitleText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: c.primary,
    textTransform: 'uppercase',
  },
  // ── Table cells ──
  row: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${c.lightBorder}`,
  },
  cell: {
    padding: '3 5',
    borderRight: `0.5pt solid ${c.lightBorder}`,
  },
  cellLabel: {
    fontSize: 5.5,
    color: c.lightText,
    marginBottom: 1,
  },
  cellValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Table border ──
  tableBox: {
    border: `0.5pt solid ${c.border}`,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  // ── Checkbox ──
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 1.5,
  },
  checkBox: {
    width: 8,
    height: 8,
    border: `0.5pt solid ${c.border}`,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxChecked: {
    width: 8,
    height: 8,
    border: `0.5pt solid ${c.check}`,
    backgroundColor: c.check,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: c.white,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  checkLabel: {
    fontSize: 6.5,
  },
  // ── Signatures ──
  signatureBox: {
    flex: 1,
    border: `0.5pt solid ${c.border}`,
    padding: 4,
    minHeight: 60,
  },
  signatureLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: c.primary,
    marginBottom: 2,
  },
  signatureImage: {
    height: 35,
    objectFit: 'contain',
  },
  signatureLine: {
    borderTop: `0.5pt solid ${c.border}`,
    marginTop: 3,
    paddingTop: 2,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    borderTop: `0.5pt solid ${c.lightBorder}`,
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 5.5,
    color: c.lightText,
  },
})

// ─── Helper components ──────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <View style={s.sectionTitle}>
    <Text style={s.sectionTitleText}>{children}</Text>
  </View>
)

const FieldCell = ({ label, value, width, style }) => (
  <View style={[s.cell, width ? { width } : { flex: 1 }, style]}>
    <Text style={s.cellLabel}>{label}</Text>
    <Text style={s.cellValue}>{value || '-'}</Text>
  </View>
)

const Checkbox = ({ checked, label }) => (
  <View style={s.checkRow}>
    <View style={checked ? s.checkBoxChecked : s.checkBox}>
      {checked && <Text style={s.checkMark}>x</Text>}
    </View>
    <Text style={s.checkLabel}>{label}</Text>
  </View>
)

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '-'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ─── PDF Document ───────────────────────────────────────────────────────────
export default function InterventionPdfReport({ intervention }) {
  const i = intervention
  const reqChannel = REQUEST_CHANNELS.find(r => r.value === i.requestChannel)?.label || i.requestChannel || ''
  const parts = i.partsUsed || []
  const sessions = i.workSessions || []
  const checklist = i.checklistVerifiche || {}
  const sigs = i.signatures || {}
  const totalParts = parts.reduce((sum, p) => sum + (p.qty || 0) * (p.unitCost || 0), 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ══════════════════ HEADER ══════════════════ */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View>
              <Text style={s.companyName}>Mi.Co.Medical</Text>
              <Text style={s.companySubtitle}>ELETTROMEDICALI E MONOUSO</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text>Via Sampolo, 3/D - 90143 Palermo</Text>
            <Text>TEL/FAX +39 091 6256377</Text>
            <Text>+39 091 345689 | +39 328 3639287</Text>
            <Text>micomedical.it | info@micomedical.it</Text>
            <Text>P.IVA 05678330829 | N.REA 270059</Text>
          </View>
        </View>

        {/* ══════════════════ TITLE ══════════════════ */}
        <View style={s.titleBar}>
          <Text style={s.titleText}>RAPPORTO DI INTERVENTO</Text>
        </View>

        {/* ══════════════════ INTERVENTO N. ══════════════════ */}
        <View style={s.tableBox}>
          <View style={s.row}>
            <FieldCell label="Intervento n." value={i.code} width="25%" />
            <FieldCell label="Data" value={formatDate(i.createdAt)} width="25%" />
            <FieldCell label="Tecnico esecuzione" value={i.techName} />
          </View>
        </View>

        {/* ══════════════════ CLIENTE ══════════════════ */}
        <SectionTitle>Dati Cliente</SectionTitle>
        <View style={s.tableBox}>
          <View style={s.row}>
            <FieldCell label="Cliente / Struttura" value={i.structure} />
            <FieldCell label="Reparto" value={i.department} width="30%" />
          </View>
          <View style={s.row}>
            <FieldCell label="Via" value={i.address} />
            <FieldCell label="Citta" value={i.city} width="30%" />
          </View>
          <View style={s.row}>
            <FieldCell label="Referente" value={i.referent} />
            <FieldCell label="Email" value={i.referentEmail} width="40%" />
          </View>
        </View>

        {/* ══════════════════ ORDINE E RICHIESTA ══════════════════ */}
        <SectionTitle>Ordine e Richiesta Intervento</SectionTitle>
        <View style={s.tableBox}>
          <View style={s.row}>
            <FieldCell label="Ordine Nr." value={i.orderNumber} width="25%" />
            <FieldCell label="Del" value={formatDate(i.orderDate)} width="25%" />
            <FieldCell label="Rif." value={i.requestReference} width="25%" />
            <FieldCell label="Richiesta Intervento" value={reqChannel} width="25%" />
          </View>
        </View>

        {/* ══════════════════ TIPOLOGIA SERVIZIO ══════════════════ */}
        <SectionTitle>Tipologia Servizio</SectionTitle>
        <View style={[s.tableBox, { padding: 4 }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TIPOLOGIA_SERVIZIO.map(tipo => (
              <Checkbox
                key={tipo}
                checked={i.tipologiaServizio === tipo || i.interventionType === tipo}
                label={tipo}
              />
            ))}
          </View>
        </View>

        {/* ══════════════════ APPARECCHIATURA ══════════════════ */}
        <SectionTitle>Apparecchiatura</SectionTitle>
        <View style={s.tableBox}>
          <View style={s.row}>
            <FieldCell label="Apparecchio / Marca" value={i.deviceName} />
            <FieldCell label="Modello / Matricola" value={i.deviceSerial} width="35%" />
            <FieldCell label="Ver. Software" value={i.deviceSoftwareVersion} width="15%" />
          </View>
        </View>

        {/* ══════════════════ GARANZIA ══════════════════ */}
        <View style={[s.tableBox, { padding: 4 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {WARRANTY_STATUS_OPTIONS.map(ws => (
              <Checkbox key={ws.value} checked={i.warrantyStatus === ws.value} label={ws.label} />
            ))}
            {i.warrantyStatus === 'garanzia' && i.warrantyExpiry && (
              <Text style={{ fontSize: 6.5, color: c.lightText }}>(fino al {formatDate(i.warrantyExpiry)})</Text>
            )}
          </View>
        </View>

        {/* ══════════════════ MOTIVAZIONE E GUASTO ══════════════════ */}
        <SectionTitle>Motivazione / Richiesta</SectionTitle>
        <View style={s.tableBox}>
          <View style={[s.cell, { borderRight: 'none' }]}>
            <Text style={[s.cellValue, { fontFamily: 'Helvetica' }]}>{i.description || '-'}</Text>
          </View>
        </View>

        <View style={[s.tableBox, { padding: 4 }]}>
          <Text style={[s.cellLabel, { marginBottom: 2 }]}>Tipo di guasto</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {FAULT_TYPES.map(ft => (
              <Checkbox key={ft} checked={i.faultType === ft} label={ft} />
            ))}
          </View>
        </View>

        {/* ══════════════════ LAVORO ESEGUITO E CAUSA ══════════════════ */}
        <SectionTitle>Lavoro Eseguito</SectionTitle>
        <View style={s.tableBox}>
          <View style={[s.cell, { borderRight: 'none' }]}>
            <Text style={[s.cellValue, { fontFamily: 'Helvetica' }]}>{i.workPerformed || '-'}</Text>
          </View>
        </View>

        <View style={s.tableBox}>
          <View style={s.row}>
            <FieldCell label="Causa" value={i.rootCause} style={{ borderRight: 'none' }} />
          </View>
        </View>

        {/* ══════════════════ STATO RIPARAZIONE ══════════════════ */}
        <View style={[s.tableBox, { padding: 4 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Checkbox checked={!!i.repairInLab} label="Riparazione in laboratorio" />
            <Checkbox checked={!!i.needsTransfer} label="Necessita trasferimenti" />
            <Checkbox checked={!!i.needsSpareParts} label="Necessita ricambi" />
          </View>
        </View>

        {/* ══════════════════ CHECKLIST VERIFICHE ══════════════════ */}
        <SectionTitle>Controlli e Verifiche</SectionTitle>
        <View style={[s.tableBox, { padding: 4 }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CHECKLIST_ITEMS.map(item => (
              <View key={item.key} style={{ width: '50%', paddingRight: 4 }}>
                <Checkbox checked={!!checklist[item.key]} label={item.label} />
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════ RICAMBI ══════════════════ */}
        <SectionTitle>Ricambi / Materiali Utilizzati</SectionTitle>
        <View style={s.tableBox}>
          {/* Header */}
          <View style={[s.row, { backgroundColor: c.bg }]}>
            <View style={[s.cell, { width: '18%' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>CODICE</Text></View>
            <View style={[s.cell, { flex: 1 }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>DESCRIZIONE</Text></View>
            <View style={[s.cell, { width: '15%' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>S/N</Text></View>
            <View style={[s.cell, { width: '8%' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>QTA</Text></View>
            <View style={[s.cell, { width: '15%', borderRight: 'none' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>COSTO</Text></View>
          </View>
          {/* Rows */}
          {parts.length > 0 ? parts.map((p, idx) => (
            <View key={idx} style={s.row}>
              <View style={[s.cell, { width: '18%' }]}><Text>{p.code || '-'}</Text></View>
              <View style={[s.cell, { flex: 1 }]}><Text>{p.name || '-'}</Text></View>
              <View style={[s.cell, { width: '15%' }]}><Text>{p.serialNumber || '-'}</Text></View>
              <View style={[s.cell, { width: '8%' }]}><Text>{p.qty || 0}</Text></View>
              <View style={[s.cell, { width: '15%', borderRight: 'none' }]}><Text>{formatCurrency((p.qty || 0) * (p.unitCost || 0))}</Text></View>
            </View>
          )) : (
            <View style={[s.row, { justifyContent: 'center', padding: 6 }]}>
              <Text style={{ color: c.lightText, fontSize: 6 }}>Nessun ricambio utilizzato</Text>
            </View>
          )}
          {/* Total */}
          {totalParts > 0 && (
            <View style={[s.row, { backgroundColor: c.bg }]}>
              <View style={[s.cell, { flex: 1 }]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>TOTALE RICAMBI</Text></View>
              <View style={[s.cell, { width: '15%', borderRight: 'none' }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCurrency(totalParts)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════ NOTE ══════════════════ */}
        {i.notes && (
          <>
            <SectionTitle>Note</SectionTitle>
            <View style={s.tableBox}>
              <View style={[s.cell, { borderRight: 'none' }]}>
                <Text style={{ fontFamily: 'Helvetica' }}>{i.notes}</Text>
              </View>
            </View>
          </>
        )}

        {/* ══════════════════ PAGE BREAK ══════════════════ */}
        {/* We use wrap=false on the following section so it stays together on page 2 if needed */}

        {/* ══════════════════ DATI INTERVENTO (sessioni) ══════════════════ */}
        <SectionTitle>Dati Intervento</SectionTitle>
        <View style={s.tableBox}>
          <View style={[s.row, { backgroundColor: c.bg }]}>
            <View style={[s.cell, { width: '25%' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>DATA</Text></View>
            <View style={[s.cell, { flex: 1 }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>TECNICO</Text></View>
            <View style={[s.cell, { width: '15%' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>ORE LAVORO</Text></View>
            <View style={[s.cell, { width: '15%', borderRight: 'none' }]}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>ORE VIAGGIO</Text></View>
          </View>
          {sessions.length > 0 ? sessions.map((sess, idx) => (
            <View key={idx} style={s.row}>
              <View style={[s.cell, { width: '25%' }]}><Text>{formatDate(sess.date)}</Text></View>
              <View style={[s.cell, { flex: 1 }]}><Text>{sess.techName || '-'}</Text></View>
              <View style={[s.cell, { width: '15%' }]}><Text>{sess.workHours || 0}</Text></View>
              <View style={[s.cell, { width: '15%', borderRight: 'none' }]}><Text>{sess.travelHours || 0}</Text></View>
            </View>
          )) : (
            <View style={[s.row, { justifyContent: 'center', padding: 6 }]}>
              <Text style={{ color: c.lightText, fontSize: 6 }}>Nessuna sessione registrata</Text>
            </View>
          )}
          {/* Totals row */}
          {sessions.length > 0 && (
            <View style={[s.row, { backgroundColor: c.bg }]}>
              <View style={[s.cell, { width: '25%' }]} />
              <View style={[s.cell, { flex: 1 }]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>TOTALE</Text></View>
              <View style={[s.cell, { width: '15%' }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {sessions.reduce((sum, sess) => sum + (parseFloat(sess.workHours) || 0), 0)}h
                </Text>
              </View>
              <View style={[s.cell, { width: '15%', borderRight: 'none' }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {sessions.reduce((sum, sess) => sum + (parseFloat(sess.travelHours) || 0), 0)}h
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════ COMPLETAMENTO ══════════════════ */}
        <SectionTitle>Completamento Intervento</SectionTitle>
        <View style={s.tableBox}>
          <View style={s.row}>
            <FieldCell label="Intervento ultimato" value={i.status === 'completed' ? 'SI' : 'NO'} width="20%" />
            <FieldCell label="Esito" value={i.outcome} width="20%" />
            <FieldCell label="Health Post" value={i.healthPost != null ? `${i.healthPost}%` : '-'} width="15%" />
            <FieldCell label="Luogo fine intervento" value={i.completionLocation} />
          </View>
          <View style={s.row}>
            <FieldCell label="Ricezione chiamata" value={formatDateTime(i.createdAt)} width="33%" />
            <FieldCell label="Inizio intervento" value={formatDateTime(i.startedAt)} width="33%" />
            <FieldCell label="Fine intervento" value={formatDateTime(i.closedAt)} style={{ borderRight: 'none' }} />
          </View>
          <View style={s.row}>
            <FieldCell label="Diritto di chiamata" value={i.calloutFee ? formatCurrency(i.calloutFee) : '-'} width="33%" />
            <FieldCell label="Trasferta" value={i.travelFee ? formatCurrency(i.travelFee) : '-'} width="33%" />
            <View style={[s.cell, { flex: 1, borderRight: 'none' }]}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Checkbox checked={!!i.calloutFee} label="Diritto di chiamata" />
                <Checkbox checked={!!i.travelFee} label="Trasferta" />
              </View>
            </View>
          </View>
        </View>

        {/* ══════════════════ FIRME ══════════════════ */}
        <SectionTitle>Firme</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
          {[
            { key: 'execution', label: 'Esecuzione intervento' },
            { key: 'confirmation', label: 'Conferma esito lavori' },
            { key: 'verification', label: 'Verifica lavori' },
          ].map(({ key, label }) => {
            const sig = sigs[key] || {}
            return (
              <View key={key} style={s.signatureBox}>
                <Text style={s.signatureLabel}>{label}</Text>
                <Text style={{ fontSize: 6, color: c.lightText, marginBottom: 2 }}>
                  Funzione: {sig.role || '_______________'}
                </Text>
                {sig.dataUrl ? (
                  <Image src={sig.dataUrl} style={s.signatureImage} />
                ) : (
                  <View style={{ height: 35, borderBottom: `0.5pt solid ${c.border}` }} />
                )}
                <View style={s.signatureLine}>
                  <Text style={{ fontSize: 5.5, color: c.lightText }}>Firma: {sig.name || '_______________'}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* ══════════════════ FOOTER ══════════════════ */}
        <View style={s.footer} fixed>
          <Text>Mi.Co.Medical S.r.l. - Via Sampolo 3/D, 90143 Palermo - P.IVA 05678330829</Text>
          <Text>Societa Certificata ISO 9001</Text>
          <Text render={({ pageNumber, totalPages }) => `Pag. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
