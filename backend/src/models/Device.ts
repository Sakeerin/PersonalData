/**
 * Device database model
 */

export interface DeviceRow {
  id: string;
  user_id: string;
  device_key_wrapped: Buffer;
  device_name: string;
  device_fingerprint: string;
  trusted: boolean;
  last_seen: Date;
  created_at: Date;
}

export interface CreateDeviceData {
  user_id: string;
  device_key_wrapped: Buffer;
  device_name: string;
  device_fingerprint: string;
  trusted?: boolean;
}

export interface UpdateDeviceData {
  device_name?: string;
  trusted?: boolean;
  last_seen?: Date;
}


