import { hasPermission, getUserPermissions, canManageRole, ALL_PERMISSIONS, ROLE_HIERARCHY } from '@/lib/permissions';

describe('permissions system', () => {
  describe('getUserPermissions', () => {
    it('returns defaults for franchisor_admin', () => {
      const perms = getUserPermissions({ role: 'franchisor_admin' });
      expect(perms.dashboard).toBe(true);
      expect(perms.users).toBe(true);
      expect(perms.reservations).toBe(true);
      expect(perms.recipes).toBe(true);
      expect(perms.invoices).toBe(true);
    });

    it('returns limited perms for employe', () => {
      const perms = getUserPermissions({ role: 'employe' });
      expect(perms.dashboard).toBe(true);
      expect(perms.orders).toBe(true);
      expect(perms.users).toBeUndefined();
      expect(perms.settings).toBeUndefined();
    });

    it('returns empty for client', () => {
      const perms = getUserPermissions({ role: 'client' });
      expect(Object.keys(perms).filter(k => perms[k] === true).length).toBe(0);
    });

    it('merges JSON overrides', () => {
      const perms = getUserPermissions({ role: 'employe', permissionsJson: '{"settings": true}' });
      expect(perms.settings).toBe(true);
      expect(perms.dashboard).toBe(true);
    });

    it('overrides can revoke defaults', () => {
      const perms = getUserPermissions({ role: 'patron', permissionsJson: '{"orders": false}' });
      expect(perms.orders).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns false for null user', () => {
      expect(hasPermission(null, 'dashboard')).toBe(false);
    });

    it('returns true for permitted role', () => {
      expect(hasPermission({ role: 'patron' }, 'orders')).toBe(true);
    });

    it('returns false for unpermitted role', () => {
      expect(hasPermission({ role: 'client' }, 'orders')).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('admin can manage manager', () => {
      expect(canManageRole('franchisor_admin', 'manager')).toBe(true);
    });

    it('manager cannot manage patron', () => {
      expect(canManageRole('manager', 'patron')).toBe(false);
    });

    it('same role cannot manage itself', () => {
      expect(canManageRole('manager', 'manager')).toBe(false);
    });

    it('patron can manage employe', () => {
      expect(canManageRole('patron', 'employe')).toBe(true);
    });
  });

  describe('ALL_PERMISSIONS', () => {
    it('has 25 permissions', () => {
      expect(ALL_PERMISSIONS.length).toBe(25);
    });

    it('includes new modules', () => {
      expect(ALL_PERMISSIONS).toContain('reservations');
      expect(ALL_PERMISSIONS).toContain('recipes');
      expect(ALL_PERMISSIONS).toContain('invoices');
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('franchisor_admin is highest', () => {
      expect(ROLE_HIERARCHY.franchisor_admin).toBe(100);
    });

    it('client is lowest', () => {
      expect(ROLE_HIERARCHY.client).toBe(10);
    });

    it('hierarchy is ordered correctly', () => {
      expect(ROLE_HIERARCHY.patron).toBeGreaterThan(ROLE_HIERARCHY.manager);
      expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.employe);
    });
  });
});
