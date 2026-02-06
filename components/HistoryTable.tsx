import type { HistoryItem } from '@/lib/types';

interface HistoryTableProps {
  items: HistoryItem[];
  onClear: () => void;
}

export default function HistoryTable({ items, onClear }: HistoryTableProps) {
  return (
    <div className="statusBox">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <b>Your results</b>
        <button id="clearHistoryBtn" className="btnGhost" type="button" onClick={onClear}>
          Clear history
        </button>
      </div>
      <div style={{ height: 10 }} />
      {items.length === 0 ? (
        <div className="muted">No rounds yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Tiles</th>
              <th>Target</th>
              <th>Your value</th>
              <th>Best</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {items
              .slice()
              .reverse()
              .map((item) => (
                <tr key={item.ts}>
                  <td>{new Date(item.ts).toLocaleString()}</td>
                  <td className="mono">{item.tiles.join(', ')}</td>
                  <td>{item.target}</td>
                  <td>{item.userValue ?? ''}</td>
                  <td>{item.bestValue ?? ''}</td>
                  <td>{item.points}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
