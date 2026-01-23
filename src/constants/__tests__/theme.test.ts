/**
 * Theme Constants Unit Tests
 */
import { colors, spacing, borderRadius, typography, shadows } from "../theme";

describe("Theme Constants", () => {
  describe("colors", () => {
    it("should have primary background color", () => {
      expect(colors.bgPrimary).toBe("#0D0D0F");
    });

    it("should have all accent colors defined", () => {
      expect(colors.accentPrimary).toBeDefined();
      expect(colors.accentSecondary).toBeDefined();
      expect(colors.accentWarning).toBeDefined();
      expect(colors.accentDanger).toBeDefined();
    });

    it("should have text colors with proper hierarchy", () => {
      expect(colors.textPrimary).toBeDefined();
      expect(colors.textSecondary).toBeDefined();
      expect(colors.textMuted).toBeDefined();
    });
  });

  describe("spacing", () => {
    it("should have consistent spacing scale", () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(12);
      expect(spacing.lg).toBe(16);
      expect(spacing.xl).toBe(20);
    });

    it("should have increasing values", () => {
      expect(spacing.sm).toBeGreaterThan(spacing.xs);
      expect(spacing.md).toBeGreaterThan(spacing.sm);
      expect(spacing.lg).toBeGreaterThan(spacing.md);
    });
  });

  describe("borderRadius", () => {
    it("should have standard radius values", () => {
      expect(borderRadius.sm).toBe(6);
      expect(borderRadius.md).toBe(8);
      expect(borderRadius.lg).toBe(12);
      expect(borderRadius.full).toBe(9999);
    });
  });

  describe("typography", () => {
    it("should have heading styles with decreasing sizes", () => {
      expect(typography.heading1.fontSize).toBeGreaterThan(typography.heading2.fontSize);
      expect(typography.heading2.fontSize).toBeGreaterThan(typography.heading3.fontSize);
      expect(typography.heading3.fontSize).toBeGreaterThan(typography.heading4.fontSize);
    });

    it("should have body styles", () => {
      expect(typography.body.fontSize).toBe(16);
      expect(typography.bodySmall.fontSize).toBe(14);
    });

    it("should have proper font weights", () => {
      expect(typography.heading1.fontWeight).toBe("700");
      expect(typography.body.fontWeight).toBe("400");
    });
  });

  describe("shadows", () => {
    it("should have increasing shadow sizes", () => {
      expect(shadows.sm.elevation).toBeLessThan(shadows.md.elevation);
      expect(shadows.md.elevation).toBeLessThan(shadows.lg.elevation);
    });

    it("should have proper shadow properties", () => {
      expect(shadows.md.shadowColor).toBeDefined();
      expect(shadows.md.shadowOffset).toBeDefined();
      expect(shadows.md.shadowOpacity).toBeDefined();
      expect(shadows.md.shadowRadius).toBeDefined();
    });
  });
});
