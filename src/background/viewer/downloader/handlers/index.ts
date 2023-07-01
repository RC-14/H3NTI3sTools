import asurascans from './asurascans';
import flamescans from './flamescans';
import kemono from './kemono';
import nhentai from './nhentai';
import pixiv from './pixiv';
import { DownloadHandler } from '/src/lib/viewer';

const handlerMap = new Map<string, DownloadHandler>();
handlerMap.set('asurascans.com', asurascans);
handlerMap.set('flamescans.org', flamescans);
handlerMap.set('asura.gg', asurascans);
handlerMap.set('kemono.party', kemono);
handlerMap.set('nhentai.net', nhentai);
handlerMap.set('pixiv.net', pixiv);
handlerMap.set('piximg.net', pixiv);
handlerMap.set('pximg.net', pixiv);

export default handlerMap;
