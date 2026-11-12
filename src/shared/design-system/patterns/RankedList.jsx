import Avatar from '../primitives/Avatar.jsx'
import Icon from '../icons/Icon.jsx'
import './rankedlist.css'

// items: [{ name, sub, score, caption }]
export default function RankedList({ items }) {
  return (
    <ol className="hms-ranked">
      {items.map((it) => (
        <li key={it.name} className="hms-ranked__item">
          <Avatar name={it.name} />
          <div className="hms-ranked__text">
            <p className="hms-ranked__name">{it.name}</p>
            {it.sub ? <p className="hms-ranked__sub">{it.sub}</p> : null}
          </div>
          <span className="hms-ranked__score"><Icon name="star" size={13} strokeWidth={1.6} />{it.score}</span>
          {it.caption ? <span className="hms-ranked__cap">{it.caption}</span> : null}
        </li>
      ))}
    </ol>
  )
}
