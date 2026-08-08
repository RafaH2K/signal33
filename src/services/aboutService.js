import * as aboutRepository from '../repositories/aboutRepository.js';

export async function getAbout() {
  return aboutRepository.getAbout();
}

export async function updateAbout(data) {
  return aboutRepository.updateAbout(data);
}
