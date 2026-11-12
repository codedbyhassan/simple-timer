import Barcode from './Barcode.jsx'
import markNavy from '../brand/mark-navy.png'
import markWhite from '../brand/mark-white.png'
import './receiptcard.css'

// Ticket-style receipt. items: [{ name, amount }]. Amounts are preformatted strings so money formatting stays in one place.
export default function ReceiptCard({ date, receiptNo, patientName, intro, items, totalLabel = 'Total', total, barcodeValue }) {
  return (
    <div className="hms-receipt-wrap">
      <article className="hms-receipt" aria-label={`Receipt ${receiptNo}`}>
        <span className="hms-receipt__ref" aria-hidden="true">{receiptNo}</span>
        <header className="hms-receipt__head">
          <span className="hms-receipt__mark">
            <img className="hms-receipt__mark--light" src={markNavy} alt="Ascend HMS" />
            <img className="hms-receipt__mark--dark" src={markWhite} alt="" aria-hidden="true" />
          </span>
          <div className="hms-receipt__meta">
            <p>{date}</p>
            <p>{receiptNo}</p>
          </div>
        </header>
        <div className="hms-receipt__who">
          <p className="hms-receipt__name">{patientName}</p>
          {intro ? <p className="hms-receipt__intro">{intro}</p> : null}
        </div>
        <ol className="hms-receipt__items">
          {items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="hms-receipt__item">
              <span className="hms-receipt__idx">{i + 1}</span>
              <span className="hms-receipt__desc">{it.name}</span>
              <span className="hms-receipt__amt">{it.amount}</span>
            </li>
          ))}
        </ol>
        <div className="hms-receipt__total">
          <span>{totalLabel}</span>
          <strong>{total}</strong>
        </div>
        <div className="hms-receipt__tear" aria-hidden="true" />
        <footer className="hms-receipt__foot"><Barcode value={barcodeValue || receiptNo} height={64} /></footer>
      </article>
    </div>
  )
}
