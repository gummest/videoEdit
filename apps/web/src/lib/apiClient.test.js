import { describe, it, expect } from 'vitest';
import apiClient from './apiClient';

describe('apiClient', () => {
  it('configures withCredentials by default', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });
});
