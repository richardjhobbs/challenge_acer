import type { Tile } from '@/lib/types';

interface TilesBoardProps {
  tiles: Tile[];
  selectedIds: string[];
  lockedId: string | null;
  onTileClick: (id: string) => void;
  hint: string;
  canOperate: boolean;
  onOperation: (op: '+' | '-' | '*' | '/') => void;
}

export default function TilesBoard({
  tiles,
  selectedIds,
  lockedId,
  onTileClick,
  hint,
  canOperate,
  onOperation
}: TilesBoardProps) {
  return (
    <div className="tilesWrap">
      <div className="muted">Tiles</div>
      <div className="tileRow">
        {tiles.map((tile) => {
          const isSelected = selectedIds.includes(tile.id);
          const isLocked = lockedId === tile.id;
          return (
            <div
              key={tile.id}
              className={`tile${tile.revealed ? ' revealed' : ''}${isSelected ? ' selected' : ''}${isLocked ? ' locked' : ''}`}
            >
              <div className="card">
                <div className="face front" />
                <div className="face back">
                  <button type="button" onClick={() => onTileClick(tile.id)}>
                    {tile.value}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="opsBar">
        <button className="opBtn" data-op="+" disabled={!canOperate} onClick={() => onOperation('+')}>
          +
        </button>
        <button className="opBtn" data-op="-" disabled={!canOperate} onClick={() => onOperation('-')}>
          -
        </button>
        <button className="opBtn" data-op="*" disabled={!canOperate} onClick={() => onOperation('*')}>
          ×
        </button>
        <button className="opBtn" data-op="/" disabled={!canOperate} onClick={() => onOperation('/')}>÷</button>
      </div>

      <div className="smallNote" style={{ textAlign: 'center' }}>
        {hint}
      </div>
    </div>
  );
}
