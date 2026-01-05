import {
  checkPermission,
  checkFieldAccess,
  filterFields,
  createPermission,
  Permission,
  AccessRequest
} from '../permissions';

describe('Permissions', () => {
  describe('checkPermission', () => {
    it('should allow action if permission matches', () => {
      const permission: Permission = {
        action: 'read'
      };
      const request: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'read'
      };

      const result = checkPermission(permission, request);
      expect(result.allowed).toBe(true);
    });

    it('should deny action if permission does not match', () => {
      const permission: Permission = {
        action: 'read'
      };
      const request: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'edit'
      };

      const result = checkPermission(permission, request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Action not permitted');
    });

    it('should check time-based conditions', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now
      const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

      // Not yet valid
      const permission1: Permission = {
        action: 'read',
        conditions: {
          validFrom: future
        }
      };
      const request: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'read',
        context: { timestamp: now }
      };
      expect(checkPermission(permission1, request).allowed).toBe(false);

      // Expired
      const permission2: Permission = {
        action: 'read',
        conditions: {
          validUntil: past
        }
      };
      expect(checkPermission(permission2, request).allowed).toBe(false);

      // Valid
      const permission3: Permission = {
        action: 'read',
        conditions: {
          validFrom: past,
          validUntil: future
        }
      };
      expect(checkPermission(permission3, request).allowed).toBe(true);
    });

    it('should check one-time access', () => {
      const permission: Permission = {
        action: 'read',
        conditions: {
          oneTime: true,
          used: true
        }
      };
      const request: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'read'
      };

      const result = checkPermission(permission, request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('One-time access already used');
    });

    it('should check IP restrictions', () => {
      const permission: Permission = {
        action: 'read',
        conditions: {
          allowedIPs: ['192.168.1.1', '10.0.0.1']
        }
      };

      const request1: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'read',
        context: { ipAddress: '192.168.1.1' }
      };
      expect(checkPermission(permission, request1).allowed).toBe(true);

      const request2: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'read',
        context: { ipAddress: '192.168.1.2' }
      };
      expect(checkPermission(permission, request2).allowed).toBe(false);
    });

    it('should check approval requirement', () => {
      const permission: Permission = {
        action: 'read',
        conditions: {
          requiresApproval: true,
          approved: false
        }
      };
      const request: AccessRequest = {
        userId: 'user1',
        resourceType: 'record',
        resourceId: 'record1',
        action: 'read'
      };

      const result = checkPermission(permission, request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Approval required');
    });
  });

  describe('checkFieldAccess', () => {
    it('should allow all fields if no restrictions', () => {
      const permission: Permission = {
        action: 'read'
      };
      expect(checkFieldAccess(permission, 'field1')).toBe(true);
    });

    it('should deny explicitly denied fields', () => {
      const permission: Permission = {
        action: 'read',
        conditions: {
          deniedFields: ['field1']
        }
      };
      expect(checkFieldAccess(permission, 'field1')).toBe(false);
      expect(checkFieldAccess(permission, 'field2')).toBe(true);
    });

    it('should only allow specified fields', () => {
      const permission: Permission = {
        action: 'read',
        conditions: {
          allowedFields: ['field1', 'field2']
        }
      };
      expect(checkFieldAccess(permission, 'field1')).toBe(true);
      expect(checkFieldAccess(permission, 'field2')).toBe(true);
      expect(checkFieldAccess(permission, 'field3')).toBe(false);
    });
  });

  describe('filterFields', () => {
    it('should return all fields if no restrictions', () => {
      const permission: Permission = {
        action: 'read'
      };
      const data = { field1: 'value1', field2: 'value2' };
      const filtered = filterFields(data, permission);
      expect(filtered).toEqual(data);
    });

    it('should filter to allowed fields only', () => {
      const permission: Permission = {
        action: 'read',
        conditions: {
          allowedFields: ['field1']
        }
      };
      const data = { field1: 'value1', field2: 'value2', field3: 'value3' };
      const filtered = filterFields(data, permission);
      expect(filtered).toEqual({ field1: 'value1' });
    });
  });

  describe('createPermission', () => {
    it('should create permission with action', () => {
      const permission = createPermission('read');
      expect(permission.action).toBe('read');
      expect(permission.conditions).toBeUndefined();
    });

    it('should create permission with conditions', () => {
      const conditions = { validUntil: new Date() };
      const permission = createPermission('read', conditions);
      expect(permission.action).toBe('read');
      expect(permission.conditions).toEqual(conditions);
    });
  });
});

