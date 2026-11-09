import { HexGeometry } from '../../../src/domain/geometry/HexGeometry';
import { HexCoord, toKey, fromKey } from '../../../src/domain/geometry/HexCoord';

describe('HexGeometry', () => {
  test('should_returnzerodistance_when_coordsequal', () => {
    // Arrange
    const a: HexCoord = { q: 3, r: -2 };
    const b: HexCoord = { q: 3, r: -2 };
    
    // Act
    const dist = HexGeometry.distance(a, b);
    
    // Assert
    expect(dist).toBe(0);
  });

  test('should_returnonedistance_when_adjacent', () => {
    // Arrange
    const center: HexCoord = { q: 0, r: 0 };
    const neighbor: HexCoord = { q: 1, r: 0 }; // E
    
    // Act
    const dist = HexGeometry.distance(center, neighbor);
    
    // Assert
    expect(dist).toBe(1);
  });

  test('should_returnmaxdistance_when_offset', () => {
    // Arrange
    const a: HexCoord = { q: 0, r: 0 };
    const b: HexCoord = { q: 3, r: -2 }; // dq=3, dr=-2, ds=-1 -> max=3
    
    // Act
    const dist = HexGeometry.distance(a, b);
    
    // Assert
    expect(dist).toBe(3);
  });

  test('should_returnsixneighbors_when_center', () => {
    // Arrange
    const center: HexCoord = { q: 0, r: 0 };
    
    // Act
    const neighbors = HexGeometry.neighbors(center);
    
    // Assert
    expect(neighbors).toHaveLength(6);
    expect(neighbors[0]).toEqual({ q: 1, r: 0 });   // E
    expect(neighbors[1]).toEqual({ q: 1, r: -1 }); // NE
    expect(neighbors[2]).toEqual({ q: 0, r: -1 }); // NW
    expect(neighbors[3]).toEqual({ q: -1, r: 0 }); // W
    expect(neighbors[4]).toEqual({ q: -1, r: 1 }); // SW
    expect(neighbors[5]).toEqual({ q: 0, r: 1 });  // SE
  });

  test('should_throw_when_invalidindex', () => {
    // Arrange
    const center: HexCoord = { q: 0, r: 0 };
    
    // Act & Assert
    expect(() => HexGeometry.neighbor(center, -1)).toThrow(RangeError);
    expect(() => HexGeometry.neighbor(center, 6)).toThrow(RangeError);
    expect(() => HexGeometry.neighbor(center, 10)).toThrow(RangeError);
  });

  test('should_rotateright_when_clockwise', () => {
    // Arrange
    const coord: HexCoord = { q: 2, r: -1 };
    
    // Act
    const rotated = HexGeometry.rotate60CW(coord);
    
    // Assert
    // rotate60CW({q, r}) = {-r, q+r} = {1, 1}
    expect(rotated).toEqual({ q: 1, r: 1 });
    
    // Verify 6 rotations returns to original
    let current = coord;
    for (let i = 0; i < 6; i++) {
      current = HexGeometry.rotate60CW(current);
    }
    expect(current).toEqual(coord);
  });

  test('should_roundtripkey_when_convert', () => {
    // Arrange
    const original: HexCoord = { q: -3, r: 5 };
    
    // Act
    const key = toKey(original);
    const restored = fromKey(key);
    
    // Assert
    expect(restored).toEqual(original);
    expect(key).toBe('-3,5');
  });
});