import asurascans from './asurascans';
import flamescans from './flamescans';
import genericDataHandler from './genericDataHandler';
import kemono from './kemono';
import mangahub from './mangahub';
import nhentai from './nhentai';
import pixiv from './pixiv';
import type { DownloadHandler } from '/src/lib/viewer';

const handlerMap = new Map<string, DownloadHandler>();
handlerMap.set('asurascans.com', asurascans);
handlerMap.set('asuracomics.com', asurascans);
handlerMap.set('asuratoon.com', asurascans);
handlerMap.set('asura.gg', asurascans);
handlerMap.set('flamescans.org', flamescans);
handlerMap.set('flamecomics.com', flamescans);
handlerMap.set('generic', genericDataHandler);
// TODO: Add handler for hentai2read
// TODO: Add handler for hiperdex
handlerMap.set('kemono.party', kemono);
handlerMap.set('kemono.su', kemono);
handlerMap.set('mangahub.io', mangahub);
handlerMap.set('mghubcdn.com', mangahub);
handlerMap.set('nacm.xyz', asurascans);
handlerMap.set('nhentai.net', nhentai);
handlerMap.set('pixiv.net', pixiv);
handlerMap.set('piximg.net', pixiv);
handlerMap.set('pximg.net', pixiv);

export default handlerMap;
