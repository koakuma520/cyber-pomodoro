// Seedance Studio Pro — 全局状态和配置
var SK={USERS:'seedance_users',SESSIONS:'seedance_sessions',API_KEY:'seedance_api_key',HISTORY:'seedance_history',TXNS:'seedance_transactions'};
var AUTH={tokenKey:'sd_auth_token',token:null,user:null,balance:0};
var isLocal=location.hostname==='localhost'||location.hostname==='127.0.0.1';
var C={API:isLocal?location.origin+'/api/v1':'https://api.atlascloud.ai/api/v1',UPLOAD:location.origin+'/api/upload-image',GEN:'/model/generateVideo',POLL:'/model/prediction/',MODELS:{text:{fast:'bytedance/seedance-2.0-fast/text-to-video',standard:'bytedance/seedance-2.0/text-to-video'},image:{fast:'bytedance/seedance-2.0-fast/image-to-video',standard:'bytedance/seedance-2.0/image-to-video'}},CREDIT:{fast:1,standard:2},POLL_INTERVAL:3000,MAX_POLL:600000};
var S={key:'',model:'fast',mode:'text',provider:'atlas',taskId:null,polling:false,pollTimer:null,pollStart:null,videoUrl:'',prompt:'',img1:null,img2:null,compare:false,tasks:[{id:null,url:'',done:false,pollTimer:null},{id:null,url:'',done:false,pollTimer:null}],resultVideoUrls:[],pendingHist:null};
var DR={chars:[],tpls:[],scenes:[],results:[],generating:false,charIdCounter:1};
var ERR_MSGS={insufficient:'余额不足',balance:'积分不足',quota:'额度不足',unauthorized:'API Key无效',forbidden:'无权限','not found':'资源不存在','rate limit':'请求过于频繁',timeout:'请求超时',content:'内容审核未通过',failed:'生成失败',error:'服务异常'};
var quotaData=null;
