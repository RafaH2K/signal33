import * as dashboardRepository from '../repositories/dashboardRepository.js';

export async function getSummary() {
  return dashboardRepository.getSummary();
}
