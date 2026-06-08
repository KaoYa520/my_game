// 游戏状态
let gameState = {
    currentScene: 'start',
    currentDialogueIndex: 0,
    stats: {
        trust: 50,        // 靖王信任值
        jingrui: 40,      // 景睿好感值
        suspicion: 20,    // 夏江怀疑值
        health: 70        // 梅长苏身体值
    },
    history: [],
    bgmPlaying: false,
    currentChapter: '序章',
    imagesPreloaded: false
};

// 图片预加载缓存
const imageCache = new Map();

// 预加载单张图片
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        if (imageCache.has(src)) {
            resolve(imageCache.get(src));
            return;
        }
        const img = new Image();
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = reject;
        img.src = src;
    });
}

// 预加载所有游戏资源
async function preloadGameAssets() {
    if (gameState.imagesPreloaded) return;

    // 收集所有需要预加载的图片
    const imagesToPreload = [];

    // 预加载背景图（只加载前5个常用背景）
    const priorityBgs = ['梅岭雪夜', '琅琊阁', '金陵城门', '苏宅内景', '谢府长廊'];
    priorityBgs.forEach(bg => {
        if (bgMap[bg]) imagesToPreload.push(bgMap[bg]);
    });

    // 预加载主要角色立绘（每个角色默认表情）
    const priorityChars = ['梅长苏', '萧景琰', '萧景睿', '谢玉', '夏江'];
    priorityChars.forEach(char => {
        if (spriteMap[char] && spriteMap[char]['默认']) {
            imagesToPreload.push(spriteMap[char]['默认']);
        }
    });

    // 批量预加载，限制并发数
    const batchSize = 3;
    for (let i = 0; i < imagesToPreload.length; i += batchSize) {
        const batch = imagesToPreload.slice(i, i + batchSize);
        await Promise.allSettled(batch.map(src => preloadImage(src)));
    }

    gameState.imagesPreloaded = true;
    console.log('游戏资源预加载完成');
}

// 智能预加载下一场景需要的图片
function preloadNextSceneImages() {
    const nextIndex = gameState.currentDialogueIndex + 1;
    if (nextIndex >= storyScript.length) return;

    const nextScenes = storyScript.slice(nextIndex, nextIndex + 3);
    const imagesToPreload = [];

    nextScenes.forEach(scene => {
        if (scene.background && bgMap[scene.background]) {
            imagesToPreload.push(bgMap[scene.background]);
        }
        if (scene.character && spriteMap[scene.character]) {
            const spritePath = spriteMap[scene.character][scene.expression] || spriteMap[scene.character]['默认'];
            if (spritePath) imagesToPreload.push(spritePath);
        }
    });

    // 异步预加载，不阻塞主线程
    imagesToPreload.forEach(src => {
        preloadImage(src).catch(() => {});
    });
}

// 角色数据
const characters = [
    {
        name: '梅长苏（林殊）',
        title: '江左盟宗主 / 麒麟才子',
        realIdentity: '赤焰少帅林殊',
        camp: '靖王阵营',
        traits: '隐忍、冷静、算无遗策、温柔克制',
        appearance: '常着素色长衫，身体虚弱，常伴药香，说话温和却极具压迫感',
        image: '人物立绘_抠图/梅长苏 微笑.png',
        description: '琅琊榜首江左梅郎、江左盟盟主，真实为当年赤焰军少帅林殊。17岁梅岭惨案侥幸存活，挫骨削皮解毒、容貌大变，身中无解火寒奇毒，常年畏寒体弱、无法修习内功。外表温润清雅、谈吐从容，心思缜密智计无双；内里背负七万赤焰亡魂血海深仇，隐忍克制，杀伐有度。玩家主控角色，依靠智谋布局破局、拉拢势力、搅动京城夺嫡。'
    },
    {
        name: '萧景琰（靖王）',
        title: '靖王 / 七珠亲王',
        realIdentity: '大梁皇七子、未来储君',
        camp: '靖王阵营',
        traits: '刚直、执拗、重情义、不擅权谋',
        appearance: '常穿深色王服，神情冷峻，情绪容易写在眼里',
        image: '人物立绘_抠图/萧景琰 威严坚毅.png',
        description: '大梁皇七子，静妃之子，常年戍守大梁北境边关，战功赫赫，因多年坚持为赤焰军鸣冤被梁帝冷落，无朝堂根基。刚正不阿、傲骨凛然，厌恶朝堂权谋诡计，重情义认死理。玩家主线扶持目标，从闲散边将逐步登顶帝位。'
    },
    {
        name: '萧景睿',
        title: '谢府公子 / 天泉山庄少主',
        realIdentity: '南楚皇族血脉',
        camp: '中立',
        traits: '温润、善良、重感情',
        appearance: '白衣公子形象，谈吐温和，总带笑意',
        image: '人物立绘_抠图/萧景睿 微笑.png',
        description: '宁国侯谢玉与莅阳长公主名义长子，实为楚国质子宇文霖与莅阳长公主之子，天泉山庄卓鼎风义子。温润善良、胸襟开阔，重情重义，待人赤诚，知晓身世真相、被谢玉利用后虽深受打击，但依旧坚守本心。前期中立线索角色，谢玉案关键突破口。'
    },
    {
        name: '谢玉',
        title: '宁国侯',
        realIdentity: '太子党核心',
        camp: '太子党',
        traits: '多疑、狠厉、控制欲强',
        appearance: '威严感极强，长期身居高位，情绪失控时极具压迫感',
        image: '人物立绘_抠图/谢玉-神色平静.png',
        description: '当朝宁国侯，太子党核心重臣，莅阳长公主丈夫，当年赤焰冤案主谋之一。阴险狠辣、野心滔天，擅长借刀杀人，为攀附皇权不择手段，策划天泉山庄刺杀案、构陷萧景睿身世。中期主线BOSS，扳倒太子的关键关卡。'
    },
    {
        name: '飞流',
        title: '梅长苏护卫',
        realIdentity: '江左盟顶尖战力',
        camp: '苏宅',
        traits: '单纯、忠诚、冷淡、危险',
        appearance: '常穿黑衣，轻功极高，喜欢蹲在屋檐或高处',
        image: '人物立绘_抠图/飞流-蹲下摆弄木头人.png',
        description: '被梅长苏从海外杀手组织解救带回，自幼遭药物控制心智、不通世俗，只听命于梅长苏，江左盟第一顶尖战力。心智如同孩童，寡言少语，单纯护主，武学天赋绝顶，天生神力。主角贴身保镖，文游战斗环节主力输出。'
    },
    {
        name: '黎纲',
        title: '江左盟心腹 / 苏宅管家',
        realIdentity: '赤焰军旧部',
        camp: '梅长苏阵营',
        traits: '稳重、谨慎、忠诚、可靠',
        appearance: '常着深色长衫，行事低调沉稳，常整理卷宗与情报',
        image: '人物立绘_抠图/黎纲-走入内室-宗主喝药.png',
        description: '原赤焰军旧部，梅岭幸存将士，江左盟金陵分舵主事，梅长苏入金陵后的府邸大管家。沉稳干练、处事周全，忠心耿耿，精通情报收集、人事调度与市井布局。主城后勤NPC，玩家可在府邸向其打探京城市井情报。'
    },
    {
        name: '莅阳长公主',
        title: '梁帝之妹',
        realIdentity: '谢玉之妻、景睿生母',
        camp: '中立偏景睿',
        traits: '隐忍、温柔、压抑、痛苦',
        appearance: '衣着华贵素雅，神情始终带有疲惫感，气质端庄沉静',
        image: '人物立绘_抠图/长公主-他说的...-因为你....png',
        description: '梁帝亲妹、晋阳长公主妹妹，谢玉正妻，萧景睿生母。半生隐忍内敛，护子心切，前期为保全子女隐忍谢玉恶行，最终为正义挺身而出，金銮殿首揭谢玉与赤焰案罪状。翻案关键人证，金銮殿对质剧情的核心触发角色。'
    },
    {
        name: '蒙挚',
        title: '禁军统领',
        realIdentity: '赤焰旧人',
        camp: '靖王阵营',
        traits: '忠义、沉稳、重情、刚直',
        appearance: '常着黑甲，身形高大，配剑不离身，神情严肃',
        image: '人物立绘_抠图/蒙挚-苏先生....png',
        description: '大梁禁军大统领、大梁当世第一武学高手，五万禁军执掌者，早年短暂在赤焰军任职，是少数知晓梅长苏真实身份之人。忠厚耿直、重信守义，不掺和皇子党争，忠于大梁社稷。朝堂关键战力NPC，夺嫡后期成为靖王重要军方助力。'
    },
    {
        name: '夏江',
        title: '悬镜司首尊',
        realIdentity: '赤焰案头号策划者',
        camp: '誉王阵营',
        traits: '阴狠、多疑、冷血、掌控欲强',
        appearance: '常着深色官袍，眼神阴冷',
        image: '人物立绘_抠图/夏江-翻阅卷宗.png',
        description: '大梁特务机构悬镜司首尊，掌管刑狱密探，赤焰冤案头号策划者，依附誉王搅动朝局。阴鸷狡诈、心狠手辣，执念权柄，为达目的不惜构陷皇子、谋害忠良。后期主线大BOSS，抓捕、清算夏江是赤焰翻案关键一步。'
    },
    {
        name: '梁帝',
        title: '大梁皇帝',
        realIdentity: '赤焰案决策者',
        camp: '皇权中心',
        traits: '多疑、冷漠、帝王心术、控制欲强',
        appearance: '身着龙袍，神情威严，目光极具压迫感',
        image: '人物立绘_抠图/梁帝-册封.png',
        description: '大梁当朝皇帝，莅阳、晋阳长公主兄长，萧景琰、太子、誉王等皇子生父。生性多疑凉薄、权欲极重，擅长制衡帝王之术，为稳固皇权默许赤焰冤案。全游顶层权力掌控者，主线最终博弈目标。'
    },
    {
        name: '卓鼎风',
        title: '天泉山庄庄主',
        realIdentity: '卓青遥之父',
        camp: '复杂中立',
        traits: '隐忍、压抑、沉重、决绝',
        appearance: '常穿深色长袍，神情疲惫，气场沉稳压抑',
        image: '人物立绘_抠图/卓鼎风-缓缓站起-你并非...png',
        description: '江湖顶尖武学世家天泉山庄庄主，天泉剑派掌门，谢玉的结拜兄弟。重江湖信义、爱惜名节，得知被谢玉利用、亲子沦为棋子后幡然醒悟，反戈指正谢玉罪行。江湖线关键NPC，谢玉案人证。'
    }
];

// BGM映射
const bgmMap = {
    '苍凉古琴': 'BGM/思念笛子.mp3',
    '低缓古琴': 'BGM/思念笛子.mp3',
    '压抑弦乐': 'BGM/思念笛子.mp3',
    '压抑古琴': 'BGM/思念笛子.mp3',
    '压抑鼓点': 'BGM/思念笛子.mp3',
    '恢弘弦乐': 'BGM/思念笛子.mp3',
    '悲凉弦乐': 'BGM/思念笛子.mp3',
    '暴雨鼓点': 'BGM/思念笛子.mp3',
    '清冷箫声': 'BGM/思念笛子.mp3',
    '空灵古琴': 'BGM/思念笛子.mp3',
    '紧张鼓点': 'BGM/思念笛子.mp3',
    '低沉古琴': 'BGM/思念笛子.mp3',
    '点击音乐': 'BGM/思念笛子.mp3'
};

// 背景图映射
const bgMap = {
    '梅岭雪夜': '游戏背景图/梅岭雪夜.jpg',
    '琅琊阁': '游戏背景图/琅琊阁.jpg',
    '金陵城门': '游戏背景图/金陵城门.jpg',
    '金陵雪夜': '游戏背景图/金陵雪夜.jpg',
    '苏宅内景': '游戏背景图/苏宅内景.jpg',
    '谢府长廊': '游戏背景图/谢府长廊.jpg',
    '宴席群像': '游戏背景图/宴席群像.jpg',
    '大厅死寂': '游戏背景图/大厅死寂.jpg',
    '谢府后院': '游戏背景图/谢府后院.jpg',
    '谢府雨夜': '游戏背景图/谢府雨夜.jpg',
    '靖王府夜色': '游戏背景图/靖王府夜色.jpg',
    '密室烛火': '游戏背景图/密室烛火.jpg',
    '悬镜司': '游戏背景图/悬镜司.jpg',
    '宫城夜色': '游戏背景图/宫城夜色.jpg',
    '苏宅书房': '游戏背景图/苏宅书房.jpg',
    '苏宅雪夜': '游戏背景图/苏宅雪夜.jpg',
    '金殿晨雪': '游戏背景图/金殿晨雪.jpg',
    '金殿雪光': '游戏背景图/金殿雪光.jpg',
    '雪夜长廊1': '游戏背景图/雪夜长廊1.jpg',
    '雪夜长廊2': '游戏背景图/雪夜长廊2.jpg',
    '空荡苏宅': '游戏背景图/空荡苏宅.jpg',
    '苏宅': '游戏背景图/苏宅.jpg'
};

// 人物立绘映射（使用抠图后的透明PNG）
const spriteMap = {
    '梅长苏': {
        '默认': '人物立绘_抠图/梅长苏 微笑.png',
        '沉思': '人物立绘_抠图/梅长苏 沉思隐忍克制.png',
        '微笑': '人物立绘_抠图/梅长苏 微笑.png',
        '咳血': '人物立绘_抠图/梅长苏 咳血.png',
        '释然': '人物立绘_抠图/梅长苏 释然.png'
    },
    '梅长苏（内心）': {
        '默认': '人物立绘_抠图/梅长苏 沉思隐忍克制.png'
    },
    '萧景琰': {
        '严肃': '人物立绘_抠图/萧景琰 严肃.png',
        '动容': '人物立绘_抠图/萧景琰 动容内心挣扎.png',
        '威严': '人物立绘_抠图/萧景琰 威严坚毅.png',
        '震惊': '人物立绘_抠图/萧景琰 难以置信震惊.png'
    },
    '靖王': {
        '严肃': '人物立绘_抠图/萧景琰 严肃.png',
        '动容': '人物立绘_抠图/萧景琰 动容内心挣扎.png',
        '威严': '人物立绘_抠图/萧景琰 威严坚毅.png',
        '震惊': '人物立绘_抠图/萧景琰 难以置信震惊.png'
    },
    '萧景睿': {
        '微笑': '人物立绘_抠图/萧景睿 微笑.png',
        '震惊': '人物立绘_抠图/萧景睿 得知身世震惊.png',
        '镇定': '人物立绘_抠图/萧景睿 强装镇定.png'
    },
    '谢玉': {
        '平静': '人物立绘_抠图/谢玉-神色平静.png',
        '意味不明': '人物立绘_抠图/谢玉-眼神意味不明.png',
        '骤变': '人物立绘_抠图/谢玉-脸色骤变.png',
        '愤怒': '人物立绘_抠图/谢玉-凭什么....png',
        '沉默': '人物立绘_抠图/谢玉-终于沉默.png'
    },
    '夏江': {
        '卷宗': '人物立绘_抠图/夏江-翻阅卷宗.png',
        '抬头': '人物立绘_抠图/夏江-抬头.png',
        '感兴趣': '人物立绘_抠图/夏江-对你很感兴趣.png'
    },
    '莅阳长公主': {
        '默认': '人物立绘_抠图/长公主-他说的...-因为你....png'
    },
    '卓鼎风': {
        '默认': '人物立绘_抠图/卓鼎风-缓缓站起-你并非...png'
    },
    '飞流': {
        '木头人': '人物立绘_抠图/飞流-蹲下摆弄木头人.png',
        '屋檐': '人物立绘_抠图/飞流-蹲在屋檐.png'
    },
    '黎纲': {
        '默认': '人物立绘_抠图/黎纲-走入内室-宗主喝药.png'
    },
    '蒙挚': {
        '默认': '人物立绘_抠图/蒙挚-苏先生....png'
    },
    '梁帝': {
        '册封': '人物立绘_抠图/梁帝-册封.png',
        '沉思': '人物立绘_抠图/梁帝-靖王....png'
    }
};

// 游戏剧情脚本
const storyScript = [
    // 序章：《麒麟入京》
    {
        type: 'chapter',
        title: '序章',
        subtitle: '《麒麟入京》',
        bgm: '苍凉古琴',
        background: '梅岭雪夜'
    },
    {
        type: 'narration',
        text: '【十三年前】',
        background: '梅岭雪夜'
    },
    {
        type: 'narration',
        text: '【梅岭大火】'
    },
    {
        type: 'narration',
        text: '【七万赤焰军覆灭】'
    },
    {
        type: 'narration',
        text: '【林殊死于梅岭】'
    },
    {
        type: 'narration',
        text: '【所有人都这样认为】'
    },
    {
        type: 'narration',
        text: '【可事实上】'
    },
    {
        type: 'narration',
        text: '【那个少年活了下来】'
    },
    {
        type: 'narration',
        text: '【只是再也回不到从前】',
        background: '琅琊阁'
    },
    {
        type: 'narration',
        text: '【十二年后】',
        background: '琅琊阁'
    },
    {
        type: 'narration',
        text: '【江湖出现一个名字】'
    },
    {
        type: 'narration',
        text: '【麒麟才子，得之可得天下】'
    },
    {
        type: 'narration',
        text: '【而这个人】'
    },
    {
        type: 'narration',
        text: '【正是梅长苏】',
        background: '金陵城门'
    },
    {
        type: 'narration',
        text: '【此时的大梁】'
    },
    {
        type: 'narration',
        text: '【太子与誉王党争不断】'
    },
    {
        type: 'narration',
        text: '【靖王因坚持赤焰旧案而被排斥于权力中心之外】'
    },
    {
        type: 'narration',
        text: '【为了赤焰军】'
    },
    {
        type: 'narration',
        text: '【为了林家】'
    },
    {
        type: 'narration',
        text: '【也为了那个始终相信赤焰军清白的人】'
    },
    {
        type: 'narration',
        text: '【我回到了金陵】'
    },
    {
        type: 'monologue',
        speaker: '梅长苏（内心）',
        text: '金陵，我回来了。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'choice',
        text: '面对进京的局势，你决定如何行动？',
        choices: [
            {
                text: '接触靖王',
                effect: { trust: 5 },
                effectText: '靖王信任值 +5',
                next: 'choice_jingwang'
            },
            {
                text: '接触誉王',
                effect: { suspicion: -5 },
                effectText: '夏江怀疑值 -5',
                next: 'choice_yuwang'
            },
            {
                text: '保持观望',
                effect: { health: 5 },
                effectText: '身体状态 +5',
                next: 'choice_wait'
            }
        ]
    },
    // 选择分支1
    {
        id: 'choice_jingwang',
        type: 'narration',
        text: '【数月之后】'
    },
    {
        type: 'narration',
        text: '【京城暗流涌动】'
    },
    {
        type: 'narration',
        text: '【太子与誉王争斗愈演愈烈】'
    },
    {
        type: 'narration',
        text: '【而我，也终于等来了谢府的请帖】'
    },
    {
        type: 'narration',
        text: '【一场改变所有人命运的夜宴】'
    },
    {
        type: 'narration',
        text: '【即将开始】',
        next: 'chapter1'
    },
    // 选择分支2
    {
        id: 'choice_yuwang',
        type: 'narration',
        text: '【接触誉王让夏江暂时放松了对我的警惕】'
    },
    {
        type: 'narration',
        text: '【数月之后】'
    },
    {
        type: 'narration',
        text: '【京城暗流涌动】'
    },
    {
        type: 'narration',
        text: '【而我，也终于等来了谢府的请帖】',
        next: 'chapter1'
    },
    // 选择分支3
    {
        id: 'choice_wait',
        type: 'narration',
        text: '【观望让局势逐渐明朗，我的身体也得到了休养】'
    },
    {
        type: 'narration',
        text: '【数月之后】'
    },
    {
        type: 'narration',
        text: '【京城暗流涌动】'
    },
    {
        type: 'narration',
        text: '【而我，也终于等来了谢府的请帖】',
        next: 'chapter1'
    },

    // 第一章：《入局》
    {
        id: 'chapter1',
        type: 'chapter',
        title: '第一章',
        subtitle: '《入局》',
        bgm: '低缓古琴',
        background: '金陵雪夜'
    },
    {
        type: 'narration',
        text: '【金陵近日很冷】',
        background: '金陵雪夜'
    },
    {
        type: 'narration',
        text: '【雪压在檐角】'
    },
    {
        type: 'narration',
        text: '【整座京城却比风雪更加压抑】'
    },
    {
        type: 'narration',
        text: '【太子与誉王相争多年】'
    },
    {
        type: 'narration',
        text: '【而如今】'
    },
    {
        type: 'narration',
        text: '【谢玉终于也被卷入其中】',
        background: '苏宅内景'
    },
    {
        type: 'narration',
        text: '【药香弥漫】'
    },
    {
        type: 'narration',
        text: '【飞流蹲在窗边摆弄木人】'
    },
    {
        type: 'narration',
        text: '【黎纲快步走入内室】'
    },
    {
        type: 'dialogue',
        speaker: '黎纲',
        text: '宗主，宁国侯府送来请帖。',
        character: '黎纲',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【我缓缓放下书卷】'
    },
    {
        type: 'dialogue',
        speaker: '梅长苏',
        text: '终于还是来了。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '黎纲',
        text: '宗主当真要去？',
        character: '黎纲',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【窗外风雪渐大】'
    },
    {
        type: 'narration',
        text: '【我沉默片刻】'
    },
    {
        type: 'dialogue',
        speaker: '梅长苏',
        text: '这一局，本就是为他准备的。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'choice',
        text: '面对谢府邀约，你如何决定？',
        choices: [
            {
                text: '立即赴宴',
                effect: { jingrui: 5 },
                effectText: '景睿好感值 +5',
                next: 'choice_attend'
            },
            {
                text: '暗中调查谢府',
                effect: {},
                effectText: '获得谢玉线索',
                next: 'choice_investigate'
            },
            {
                text: '先观察誉王动向',
                effect: { suspicion: -5 },
                effectText: '夏江怀疑值 -5',
                next: 'choice_observe'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_attend',
        type: 'narration',
        text: '【夜宴已经散去】'
    },
    {
        type: 'narration',
        text: '【宾客陆续离开】'
    },
    {
        type: 'narration',
        text: '【唯独景睿仍站在雪地里】',
        next: 'chapter3'
    },
    {
        id: 'choice_investigate',
        type: 'narration',
        text: '【暗中调查获得了关于谢玉的重要线索】'
    },
    {
        type: 'narration',
        text: '【夜宴已经散去】',
        next: 'chapter3'
    },
    {
        id: 'choice_observe',
        type: 'narration',
        text: '【观察誉王动向让悬镜司放松了警惕】'
    },
    {
        type: 'narration',
        text: '【夜宴已经散去】',
        next: 'chapter2'
    },

    // 第二章：《谢府夜宴》
    {
        id: 'chapter2',
        type: 'chapter',
        title: '第二章',
        subtitle: '《谢府夜宴》',
        bgm: '压抑弦乐',
        background: '谢府长廊'
    },
    {
        type: 'narration',
        text: '【谢府今夜格外热闹】',
        background: '谢府长廊'
    },
    {
        type: 'narration',
        text: '【长廊灯火一路铺开】'
    },
    {
        type: 'narration',
        text: '【可所有人的笑意】'
    },
    {
        type: 'narration',
        text: '【都像浮在表面的假象】'
    },
    {
        type: 'dialogue',
        speaker: '言豫津',
        text: '苏兄来了！',
        position: 'right'
    },
    {
        type: 'dialogue',
        speaker: '萧景睿',
        text: '苏兄，请。',
        character: '萧景睿',
        expression: '微笑',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【景睿依旧温和】'
    },
    {
        type: 'narration',
        text: '【可我却知道】'
    },
    {
        type: 'narration',
        text: '【今晚之后】'
    },
    {
        type: 'narration',
        text: '【他的人生将彻底改变】',
        background: '宴席群像'
    },
    {
        type: 'narration',
        text: '【宾客落座】'
    },
    {
        type: 'narration',
        text: '【谢玉神色平静】'
    },
    {
        type: 'narration',
        text: '【卓鼎风却始终沉默】'
    },
    {
        type: 'narration',
        text: '【空气里隐隐透着压抑】'
    },
    {
        type: 'dialogue',
        speaker: '谢玉',
        text: '苏先生近来名声很盛啊。',
        character: '谢玉',
        expression: '平静',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '梅长苏',
        text: '侯爷过誉。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【谢玉看着我】'
    },
    {
        type: 'narration',
        text: '【眼神意味不明】'
    },
    {
        type: 'monologue',
        speaker: '梅长苏（内心）',
        text: '他已经开始怀疑了。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【酒过三巡】'
    },
    {
        type: 'narration',
        text: '【卓鼎风终于缓缓站起】'
    },
    {
        type: 'narration',
        text: '【厅内忽然安静下来】'
    },
    {
        type: 'dialogue',
        speaker: '卓鼎风',
        text: '侯爷，有些事情，是不是也该说清楚了？',
        character: '卓鼎风',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【谢玉脸色骤变】'
    },

    // 第三章：《真相》
    {
        id: 'chapter3',
        type: 'chapter',
        title: '第三章',
        subtitle: '《真相》',
        bgm: '压抑鼓点',
        background: '大厅死寂'
    },
    {
        type: 'narration',
        text: '【厅中安静得可怕】',
        background: '大厅死寂'
    },
    {
        type: 'narration',
        text: '【所有人都看向卓鼎风】'
    },
    {
        type: 'dialogue',
        speaker: '卓鼎风',
        text: '景睿，你并非谢玉亲子。',
        character: '卓鼎风',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【酒盏落地】'
    },
    {
        type: 'narration',
        text: '【景睿猛地抬头】'
    },
    {
        type: 'dialogue',
        speaker: '萧景睿',
        text: '你说什么？',
        character: '萧景睿',
        expression: '震惊',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【无人回应】'
    },
    {
        type: 'narration',
        text: '【风声越来越重】'
    },
    {
        type: 'dialogue',
        speaker: '莅阳长公主',
        text: '景睿……他说的是真的。',
        character: '莅阳长公主',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【景睿后退一步】'
    },
    {
        type: 'narration',
        text: '【像忽然失去了所有力气】'
    },
    {
        type: 'dialogue',
        speaker: '萧景睿',
        text: '不可能……怎么会……',
        character: '萧景睿',
        expression: '震惊',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【我下意识向前一步】'
    },
    {
        type: 'narration',
        text: '【却最终还是停住】'
    },
    {
        type: 'monologue',
        speaker: '梅长苏（内心）',
        text: '这世上最残忍的事，从来都是真相。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'choice',
        text: '你决定如何面对景睿？',
        choices: [
            {
                text: '上前扶住他',
                effect: { jingrui: 15 },
                effectText: '景睿好感值 +15',
                next: 'choice_help'
            },
            {
                text: '保持沉默',
                effect: { health: 10 },
                effectText: '冷静值 +10（身体状态恢复）',
                next: 'choice_silent'
            },
            {
                text: '继续逼问谢玉',
                effect: { suspicion: 10 },
                effectText: '谢玉崩溃值 +10',
                next: 'choice_pressure'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_help',
        type: 'narration',
        text: '【我伸手扶住他】'
    },
    {
        type: 'dialogue',
        speaker: '梅长苏',
        text: '景睿，先冷静。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '萧景睿',
        text: '苏兄……',
        character: '萧景睿',
        expression: '震惊',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【景睿站在大厅中央】',
        next: 'chapter4'
    },
    {
        id: 'choice_silent',
        type: 'narration',
        text: '【我没有动】'
    },
    {
        type: 'narration',
        text: '【因为有些真相】'
    },
    {
        type: 'narration',
        text: '【只能靠他自己接受】',
        next: 'chapter4'
    },
    {
        id: 'choice_pressure',
        type: 'dialogue',
        speaker: '梅长苏',
        text: '侯爷不打算继续解释吗？',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【谢玉终于失控】',
        next: 'chapter4'
    },

    // 第四章：《离席》
    {
        id: 'chapter4',
        type: 'chapter',
        title: '第四章',
        subtitle: '《离席》',
        bgm: '空灵古琴',
        background: '谢府后院'
    },
    {
        type: 'narration',
        text: '【夜宴已经散去】',
        background: '谢府后院'
    },
    {
        type: 'narration',
        text: '【宾客陆续离开】'
    },
    {
        type: 'narration',
        text: '【唯独景睿仍站在雪地里】'
    },
    {
        type: 'narration',
        text: '【仿佛不知道自己该去哪里】'
    },
    {
        type: 'narration',
        text: '【我缓步走近】'
    },
    {
        type: 'dialogue',
        speaker: '萧景睿',
        text: '苏兄，你是不是早就知道？',
        character: '萧景睿',
        expression: '镇定',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【夜风吹起衣摆】'
    },
    {
        type: 'narration',
        text: '【我沉默许久】'
    },
    {
        type: 'dialogue',
        speaker: '梅长苏',
        text: '有些事，知道未必是幸事。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '萧景睿',
        text: '可至少不会像今天这样，忽然什么都没有了。',
        character: '萧景睿',
        expression: '镇定',
        position: 'right'
    },
    {
        type: 'choice',
        text: '你决定如何安慰景睿？',
        choices: [
            {
                text: '陪景睿喝酒',
                effect: { jingrui: 10 },
                effectText: '景睿好感值 +10',
                next: 'choice_drink'
            },
            {
                text: '劝他回家',
                effect: { jingrui: 5 },
                effectText: '景睿好感值 +5',
                next: 'choice_home'
            },
            {
                text: '告诉他去找豫津',
                effect: { jingrui: 3 },
                effectText: '景睿好感值 +3',
                next: 'choice_friend'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_drink',
        type: 'narration',
        text: '【我接过酒壶】'
    },
    {
        type: 'narration',
        text: '【陪他坐到天亮】',
        next: 'chapter5'
    },
    {
        id: 'choice_home',
        type: 'dialogue',
        speaker: '梅长苏',
        text: '无论真相如何，长公主依旧是你的母亲。',
        character: '梅长苏',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【景睿沉默良久，终于点了点头】',
        next: 'chapter5'
    },
    {
        id: 'choice_friend',
        type: 'narration',
        text: '【有些伤痛】'
    },
    {
        type: 'narration',
        text: '【或许只有朋友能陪他熬过去】',
        next: 'chapter5'
    },

    // 第五章：《崩塌》
    {
        id: 'chapter5',
        type: 'chapter',
        title: '第五章',
        subtitle: '《崩塌》',
        bgm: '暴雨鼓点',
        background: '谢府雨夜'
    },
    {
        type: 'narration',
        text: '【雨下得很大】',
        background: '谢府雨夜'
    },
    {
        type: 'narration',
        text: '【谢玉独自站在长阶前】'
    },
    {
        type: 'narration',
        text: '【像终于无路可退的人】'
    },
    {
        type: 'dialogue',
        speaker: '谢玉',
        text: '这些年我为朝廷做了多少事？！凭什么最后所有罪都要我来担？！',
        character: '谢玉',
        expression: '愤怒',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '莅阳长公主',
        text: '因为你错了。',
        character: '莅阳长公主',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【谢玉终于沉默】'
    },
    {
        type: 'narration',
        text: '【雨水顺着石阶流下】'
    },
    {
        type: 'narration',
        text: '【而景睿始终没有再开口】'
    },
    {
        type: 'monologue',
        speaker: '梅长苏（内心）',
        text: '谢玉终于怕了。可十三年前，赤焰军没有一个人怕过。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【夜深后】'
    },
    {
        type: 'narration',
        text: '【景琰站在长廊尽头】'
    },
    {
        type: 'narration',
        text: '【远远看着我离开的背影】'
    },
    {
        type: 'narration',
        text: '【不知为何】'
    },
    {
        type: 'narration',
        text: '【他忽然想起了很多年前的林殊】'
    },
    {
        type: 'monologue',
        speaker: '靖王（内心）',
        text: '真的只是巧合吗……',
        character: '靖王',
        expression: '动容',
        position: 'left'
    },

    // 第六章：《旧影》
    {
        id: 'chapter6',
        type: 'chapter',
        title: '第六章',
        subtitle: '《旧影》',
        bgm: '清冷箫声',
        background: '靖王府夜色'
    },
    {
        type: 'narration',
        text: '【景琰近日越来越沉默】',
        background: '靖王府夜色'
    },
    {
        type: 'narration',
        text: '【他开始频繁想起林殊】'
    },
    {
        type: 'narration',
        text: '【也开始越来越在意梅长苏】'
    },
    {
        type: 'dialogue',
        speaker: '蒙挚',
        text: '苏先生确实聪明。可有时候，也未免太像一个人了。',
        character: '蒙挚',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【景琰忽然抬头】'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '像谁？',
        character: '靖王',
        expression: '严肃',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【蒙挚却沉默了】'
    },
    {
        type: 'narration',
        text: '【飞流蹲在屋檐上】',
        background: '苏宅'
    },
    {
        type: 'narration',
        text: '【景琰缓缓走入院中】'
    },
    {
        type: 'dialogue',
        speaker: '飞流',
        text: '林殊……',
        character: '飞流',
        expression: '屋檐',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【空气瞬间凝固】'
    },
    {
        type: 'narration',
        text: '【景琰猛地回头】'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '你刚刚说什么？',
        character: '靖王',
        expression: '震惊',
        position: 'right'
    },

    // 第七章：《林殊》
    {
        id: 'chapter7',
        type: 'chapter',
        title: '第七章',
        subtitle: '《林殊》',
        bgm: '低沉古琴',
        background: '密室烛火'
    },
    {
        type: 'narration',
        text: '【夜色寂静】',
        background: '密室烛火'
    },
    {
        type: 'narration',
        text: '【景琰站在我面前】'
    },
    {
        type: 'narration',
        text: '【目光第一次如此锋利】'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '先生，你究竟是谁？',
        character: '靖王',
        expression: '威严',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【烛火轻轻摇晃】'
    },
    {
        type: 'narration',
        text: '【而我终于有些不敢看他】'
    },
    {
        type: 'choice',
        text: '面对景琰的质问，你如何回应？',
        choices: [
            {
                text: '转移话题',
                effect: { suspicion: 10 },
                effectText: '靖王怀疑值 +10',
                next: 'choice_dodge'
            },
            {
                text: '沉默默认',
                effect: { trust: 15 },
                effectText: '靖王信任值 +15',
                next: 'choice_silent2'
            },
            {
                text: '半承认身份',
                effect: { trust: 30 },
                effectText: '靖王信任值 +30',
                next: 'choice_admit'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_dodge',
        type: 'dialogue',
        speaker: '梅长苏',
        text: '殿下如今最重要的，是朝堂之争。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '我要听的不是这个。',
        character: '靖王',
        expression: '严肃',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【景琰的眼神更加锐利】',
        next: 'chapter8'
    },
    {
        id: 'choice_silent2',
        type: 'narration',
        text: '【我没有说话】'
    },
    {
        type: 'narration',
        text: '【而沉默，有时候比承认更残忍】'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '真的是你……',
        character: '靖王',
        expression: '动容',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【风雪吹入长廊】',
        next: 'chapter8'
    },
    {
        id: 'choice_admit',
        type: 'dialogue',
        speaker: '梅长苏',
        text: '林殊已经死了。',
        character: '梅长苏',
        expression: '释然',
        position: 'right'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '可你还活着。',
        character: '靖王',
        expression: '动容',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【很多年前那个鲜衣怒马的少年】'
    },
    {
        type: 'narration',
        text: '【仿佛终于再次回来了】',
        next: 'chapter8'
    },

    // 第八章：《疑云》
    {
        id: 'chapter8',
        type: 'chapter',
        title: '第八章',
        subtitle: '《疑云》',
        bgm: '紧张鼓点',
        background: '悬镜司'
    },
    {
        type: 'narration',
        text: '【阴暗的书房中】',
        background: '悬镜司'
    },
    {
        type: 'narration',
        text: '【夏江正在翻阅卷宗】'
    },
    {
        type: 'dialogue',
        speaker: '夏江',
        text: '苏哲，江左盟宗主，麒麟才子。',
        character: '夏江',
        expression: '卷宗',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '夏江',
        text: '一个病秧子，凭什么能左右朝局？',
        character: '夏江',
        expression: '抬头',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【童路情报被摆上案桌】'
    },
    {
        type: 'narration',
        text: '【飞流身份也被记录下来】'
    },
    {
        type: 'choice',
        text: '如何应对夏江的调查？',
        choices: [
            {
                text: '主动暴露部分情报',
                effect: { suspicion: -10 },
                effectText: '夏江怀疑值 -10',
                next: 'choice_bait'
            },
            {
                text: '命江左盟隐藏行动',
                effect: { suspicion: -5 },
                effectText: '夏江怀疑值 -5',
                next: 'choice_hide'
            },
            {
                text: '继续正常布局',
                effect: { suspicion: 5 },
                effectText: '夏江怀疑值 +5',
                next: 'choice_continue'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_bait',
        type: 'narration',
        text: '【故意放出假消息】'
    },
    {
        type: 'narration',
        text: '【转移悬镜司注意力】',
        next: 'chapter9'
    },
    {
        id: 'choice_hide',
        type: 'narration',
        text: '【所有情报线暂时沉寂】'
    },
    {
        type: 'narration',
        text: '【苏宅内外一片寂静】',
        next: 'chapter9'
    },
    {
        id: 'choice_continue',
        type: 'narration',
        text: '【过度谨慎反而容易露出破绽】'
    },
    {
        type: 'narration',
        text: '【保持原有节奏继续布局】',
        next: 'chapter9'
    },

    // 第九章：《暗潮》
    {
        id: 'chapter9',
        type: 'chapter',
        title: '第九章',
        subtitle: '《暗潮》',
        bgm: '压抑鼓点',
        background: '宫城夜色'
    },
    {
        type: 'narration',
        text: '【谢玉倒台后】',
        background: '宫城夜色'
    },
    {
        type: 'narration',
        text: '【朝局彻底失衡】'
    },
    {
        type: 'narration',
        text: '【誉王开始频繁动作】'
    },
    {
        type: 'narration',
        text: '【而夏江】'
    },
    {
        type: 'narration',
        text: '【也终于开始注意到我】'
    },
    {
        type: 'dialogue',
        speaker: '夏江',
        text: '苏先生，老夫最近，对你很感兴趣。',
        character: '夏江',
        expression: '感兴趣',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【他目光阴冷】'
    },
    {
        type: 'narration',
        text: '【像毒蛇一样】'
    },
    {
        type: 'monologue',
        speaker: '梅长苏（内心）',
        text: '真正危险的人，终于还是来了。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【与此同时】'
    },
    {
        type: 'narration',
        text: '【景琰也第一次真正被梁帝注意】'
    },
    {
        type: 'dialogue',
        speaker: '梁帝',
        text: '靖王近来，倒是成长不少。',
        character: '梁帝',
        expression: '沉思',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【誉王神色骤沉】'
    },
    {
        type: 'narration',
        text: '【而我知道】'
    },
    {
        type: 'narration',
        text: '【棋局终于开始转动了】',
        next: 'chapter10'
    },

    // 第十章：《雪夜棋局》
    {
        id: 'chapter10',
        type: 'chapter',
        title: '第十章',
        subtitle: '《雪夜棋局》',
        bgm: '压抑古琴',
        background: '苏宅书房'
    },
    {
        type: 'narration',
        text: '【大雪封城】',
        background: '苏宅书房'
    },
    {
        type: 'narration',
        text: '【我与景琰对坐】'
    },
    {
        type: 'narration',
        text: '【棋盘黑白交错】'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '先生，誉王最近很安静。',
        character: '靖王',
        expression: '严肃',
        position: 'left'
    },
    {
        type: 'dialogue',
        speaker: '梅长苏',
        text: '太安静的人，往往最危险。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'dialogue',
        speaker: '靖王',
        text: '那我们该怎么办？',
        character: '靖王',
        expression: '严肃',
        position: 'left'
    },
    {
        type: 'choice',
        text: '如何回应景琰的询问？',
        choices: [
            {
                text: '继续隐忍',
                effect: { trust: 5 },
                effectText: '靖王信任值 +5',
                next: 'choice_wait2'
            },
            {
                text: '主动布局',
                effect: { trust: 10 },
                effectText: '靖王信任值 +10',
                next: 'choice_layout'
            },
            {
                text: '告知部分真相',
                effect: { trust: 15 },
                effectText: '靖王信任值 +15',
                next: 'choice_truth'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_wait2',
        type: 'dialogue',
        speaker: '梅长苏',
        text: '等他先出手。',
        character: '梅长苏',
        expression: '默认',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【景琰点了点头】',
        next: 'chapter11'
    },
    {
        id: 'choice_layout',
        type: 'narration',
        text: '【景琰第一次参与完整谋划】'
    },
    {
        type: 'narration',
        text: '【他的眼神逐渐变得深邃】',
        next: 'chapter11'
    },
    {
        id: 'choice_truth',
        type: 'narration',
        text: '【景琰看着我】'
    },
    {
        type: 'narration',
        text: '【眼神越来越复杂】',
        next: 'chapter11'
    },

    // 第十一章：《风雪欲来》
    {
        id: 'chapter11',
        type: 'chapter',
        title: '第十一章',
        subtitle: '《风雪欲来》',
        bgm: '悲凉弦乐',
        background: '苏宅雪夜'
    },
    {
        type: 'narration',
        text: '【雪越来越大】',
        background: '苏宅雪夜'
    },
    {
        type: 'narration',
        text: '【整个金陵都被白色覆盖】'
    },
    {
        type: 'narration',
        text: '【而我却越来越清楚】'
    },
    {
        type: 'narration',
        text: '【留给自己的时间，不多了】'
    },
    {
        type: 'dialogue',
        speaker: '黎纲',
        text: '宗主，该喝药了。',
        character: '黎纲',
        expression: '默认',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【我低低咳了一声】'
    },
    {
        type: 'narration',
        text: '【掌心已经隐隐带血】'
    },
    {
        type: 'choice',
        text: '面对不断恶化的身体，你决定？',
        choices: [
            {
                text: '继续强撑布局',
                effect: { health: -20 },
                effectText: '身体状态 -20',
                next: 'choice_push'
            },
            {
                text: '暂时休养',
                effect: { health: 10 },
                effectText: '身体状态 +10',
                next: 'choice_rest'
            },
            {
                text: '将部分计划交给景琰',
                effect: { trust: 20, health: 5 },
                effectText: '靖王成长值 +20，身体状态 +5',
                next: 'choice_delegate'
            }
        ]
    },
    // 选择分支
    {
        id: 'choice_push',
        type: 'narration',
        text: '【我低头咳嗽】'
    },
    {
        type: 'narration',
        text: '【血色缓缓染红衣袖】'
    },
    {
        type: 'narration',
        text: '【可我依旧没有停下】',
        next: 'chapter12'
    },
    {
        id: 'choice_rest',
        type: 'narration',
        text: '【苏宅忽然安静下来】'
    },
    {
        type: 'narration',
        text: '【像暴风雨来临前的平静】',
        next: 'chapter12'
    },
    {
        id: 'choice_delegate',
        type: 'dialogue',
        speaker: '梅长苏',
        text: '有些路，终究还是要殿下自己走。',
        character: '梅长苏',
        expression: '释然',
        position: 'right'
    },
    {
        type: 'narration',
        text: '【景琰郑重地点了点头】',
        next: 'chapter12'
    },

    // 第十二章：《七珠亲王》
    {
        id: 'chapter12',
        type: 'chapter',
        title: '第十二章',
        subtitle: '《七珠亲王》',
        bgm: '恢弘弦乐',
        background: '金殿晨雪'
    },
    {
        type: 'narration',
        text: '【大雪落满长阶】',
        background: '金殿晨雪'
    },
    {
        type: 'narration',
        text: '【今日的皇城】'
    },
    {
        type: 'narration',
        text: '【比往日更加安静】'
    },
    {
        type: 'narration',
        text: '礼官：宣——靖王入殿——'
    },
    {
        type: 'narration',
        text: '【景琰缓缓走上金阶】'
    },
    {
        type: 'narration',
        text: '【他的背影依旧笔直】'
    },
    {
        type: 'dialogue',
        speaker: '梁帝',
        text: '靖王近来办事有功。即日起，册封七珠亲王。',
        character: '梁帝',
        expression: '册封',
        position: 'left'
    },
    {
        type: 'narration',
        text: '【满朝跪拜】'
    },
    {
        type: 'narration',
        text: '【风雪吹入大殿】'
    },
    {
        type: 'narration',
        text: '【而我终于轻轻松了口气】'
    },
    {
        type: 'monologue',
        speaker: '梅长苏（内心）',
        text: '景琰，你终于走到这一步了。',
        character: '梅长苏',
        expression: '微笑',
        position: 'right'
    },

    // 结局判定
    {
        id: 'ending_check',
        type: 'ending_check',
        endings: [
            {
                condition: (stats) => stats.trust >= 60 && stats.jingrui >= 50 && stats.suspicion <= 40,
                id: 'ending_best',
                title: '结局一：《风起金陵》',
                subtitle: '【最佳结局】'
            },
            {
                condition: (stats) => stats.trust >= 40 && stats.health >= 30,
                id: 'ending_normal',
                title: '结局二：《长夜未明》',
                subtitle: '【普通结局】'
            },
            {
                condition: () => true,
                id: 'ending_bad',
                title: '结局三：《故人不识》',
                subtitle: '【BE结局】'
            }
        ]
    },

    // 最佳结局
    {
        id: 'ending_best',
        type: 'ending',
        title: '结局一：《风起金陵》',
        subtitle: '【最佳结局】',
        bgm: '恢弘弦乐',
        background: '金殿雪光',
        content: [
            '【大雪落满长阶】',
            '【景琰终于站上朝堂中央】',
            '【群臣俯首】',
            '【而太子与誉王第一次真正感到了威胁】',
            '梁帝：靖王近来，倒是成长不少。',
            '【景琰缓缓抬头】',
            '【而我站在殿外】',
            '【终于轻轻松了口气】',
            '梅长苏（内心）：景琰，从今日起，你终于真正进入这场棋局了。'
        ]
    },

    // 普通结局
    {
        id: 'ending_normal',
        type: 'ending',
        title: '结局二：《长夜未明》',
        subtitle: '【普通结局】',
        bgm: '低缓古琴',
        background: '雪夜长廊1',
        content: [
            '【谢玉终于倒台】',
            '【可京城却并未真正平静】',
            '【誉王仍在布局】',
            '【太子依旧虎视眈眈】',
            '【而景琰，只是终于迈出了第一步】',
            '靖王：先生，接下来，我们还会赢吗？',
            '【我沉默很久】',
            '【最后只是轻轻笑了笑】',
            '梅长苏：殿下，风暴才刚刚开始。'
        ]
    },

    // BE结局
    {
        id: 'ending_bad',
        type: 'ending',
        title: '结局三：《故人不识》',
        subtitle: '【BE结局】',
        bgm: '悲凉弦乐',
        background: '空荡苏宅',
        content: [
            '【景琰推开房门】',
            '【却只看见桌上一封信】',
            '梅长苏（信件）：有些真相，终究还是不知道更好。',
            '【风雪吹灭最后一点烛火】'
        ]
    }
];

// 游戏逻辑函数

// 初始化角色介绍界面
function initCharacterScreen() {
    const grid = document.getElementById('character-grid');
    if (!grid) return;

    grid.innerHTML = characters.map(char => `
        <div class="character-card">
            <img class="character-image" src="${char.image}" alt="${char.name}" loading="lazy" onerror="this.style.display='none'">
            <div class="character-info">
                <h3>${char.name}</h3>
                <div class="info-row"><span class="label">身份：</span>${char.title}</div>
                <div class="info-row"><span class="label">真实身份：</span>${char.realIdentity}</div>
                <div class="info-row"><span class="label">性格：</span><span class="traits">${char.traits}</span></div>
                <div class="info-row"><span class="label">外貌：</span>${char.appearance}</div>
                ${char.description ? `<div class="description">${char.description}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// 显示角色介绍界面
function showCharacterScreen() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('character-screen').classList.add('active');
}

// 返回开始界面
function backToStart() {
    document.getElementById('character-screen').classList.remove('active');
    document.getElementById('start-screen').classList.remove('hidden');
}

// 开始游戏
async function startGame() {
    // 预加载所有背景图
    preloadAllBackgrounds().catch(() => {});

    // 初始化音频（等待用户首次交互）
    initAudioOnFirstInteraction();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('active');

    // 重置游戏状态
    gameState = {
        currentScene: 'start',
        currentDialogueIndex: 0,
        stats: {
            trust: 50,
            jingrui: 40,
            suspicion: 20,
            health: 70
        },
        history: [],
        bgmPlaying: true,  // 默认开启音乐
        currentChapter: '序章',
        imagesPreloaded: false
    };

    // 更新BGM按钮状态
    const bgmBtn = document.getElementById('bgm-btn');
    if (bgmBtn) {
        bgmBtn.textContent = '🎵 音乐: 开';
    }

    updateStatsUI();
    renderScene();
}

// 更新状态栏UI
function updateStatsUI(changes) {
    changes = changes || {};
    const stats = gameState.stats;

    document.getElementById('trust-value').textContent = stats.trust;
    document.getElementById('jingrui-value').textContent = stats.jingrui;
    document.getElementById('suspicion-value').textContent = stats.suspicion;
    document.getElementById('health-value').textContent = stats.health;
    document.getElementById('chapter-value').textContent = gameState.currentChapter;

    // 显示数值变化
    if (Object.keys(changes).length > 0) {
        showStatChanges(changes);
    }
}

// 显示数值变化提示
function showStatChanges(changes) {
    const container = document.getElementById('stat-changes');
    if (!container) return;

    container.innerHTML = '';

    const statNames = {
        trust: '靖王信任',
        jingrui: '景睿好感',
        suspicion: '夏江怀疑',
        health: '身体状态'
    };

    Object.entries(changes).forEach(([key, value]) => {
        const popup = document.createElement('div');
        popup.className = 'stat-change-popup ' + (value >= 0 ? 'positive' : 'negative');
        popup.textContent = statNames[key] + ' ' + (value >= 0 ? '+' : '') + value;
        container.appendChild(popup);
    });

    // 自动清理
    setTimeout(() => {
        container.innerHTML = '';
    }, 2500);
}

// 当前BGM状态
let currentBGM = null;
let audioContext = null;
let bgmEnabled = false;

// 初始化音频上下文（解决浏览器自动播放限制）
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// 播放BGM - 修复自动播放问题
function playBGM(bgmName) {
    const player = document.getElementById('bgm-player');
    const bgmPath = bgmMap[bgmName];

    if (!bgmPath) return;

    // 如果音乐已启用且是当前音乐，不重复播放
    if (currentBGM === bgmPath && !player.paused) return;

    // 保存当前音乐
    currentBGM = bgmPath;

    // 加载音乐
    player.src = bgmPath;
    player.volume = 0.4;
    player.loop = true;

    // 如果音乐开关是开的状态，尝试播放
    if (gameState.bgmPlaying) {
        player.play().catch(e => {
            console.log('BGM 等待用户交互后播放');
        });
    }
}

// 切换BGM开关
function toggleBGM() {
    const player = document.getElementById('bgm-player');
    const btn = document.getElementById('bgm-btn');

    gameState.bgmPlaying = !gameState.bgmPlaying;

    if (gameState.bgmPlaying) {
        btn.textContent = '🎵 音乐: 开';
        // 尝试播放当前BGM
        if (currentBGM && player.src) {
            player.play().catch(e => console.log('BGM play failed:', e));
        }
    } else {
        btn.textContent = '🎵 音乐: 关';
        player.pause();
    }
}

// 用户首次交互时启动音频系统
function initAudioOnFirstInteraction() {
    const player = document.getElementById('bgm-player');

    function startAudio() {
        // 初始化音频上下文
        initAudioContext();

        // 尝试播放BGM
        if (gameState.bgmPlaying && currentBGM && player.paused) {
            player.play().catch(() => {});
        }

        // 标记音频已初始化
        bgmEnabled = true;

        // 移除监听器
        document.removeEventListener('click', startAudio);
        document.removeEventListener('keydown', startAudio);
    }

    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);
}

// 背景图缓存
const bgImageCache = new Map();

// 预加载背景图
function preloadBackground(bgName) {
    const bgPath = bgMap[bgName];
    if (!bgPath) return Promise.resolve();
    if (bgImageCache.has(bgPath)) return Promise.resolve(bgPath);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            bgImageCache.set(bgPath, img);
            resolve(bgPath);
        };
        img.onerror = reject;
        img.src = bgPath;
    });
}

// 设置背景图 - 优化加载速度
async function setBackground(bgName) {
    const bg = document.getElementById('background');
    if (!bg) return;

    const bgPath = bgMap[bgName];
    if (!bgPath) return;

    // 检查是否已缓存
    let cachedBg = bgImageCache.get(bgPath);

    if (cachedBg) {
        // 已缓存，直接显示
        bg.style.backgroundImage = 'url(' + bgPath + ')';
        bg.style.opacity = '1';
    } else {
        // 未缓存，先淡出
        bg.style.opacity = '0';

        // 等待图片加载完成
        try {
            await preloadBackground(bgName);
            bg.style.backgroundImage = 'url(' + bgPath + ')';
            // 短暂延迟确保图片渲染
            setTimeout(() => {
                bg.style.opacity = '1';
            }, 50);
        } catch (e) {
            // 加载失败也显示
            bg.style.backgroundImage = 'url(' + bgPath + ')';
            setTimeout(() => {
                bg.style.opacity = '1';
            }, 100);
        }
    }
}

// 预加载所有背景图（游戏开始时调用）
async function preloadAllBackgrounds() {
    const bgNames = Object.keys(bgMap);
    console.log('预加载背景图...');

    // 并行预加载所有背景
    await Promise.allSettled(bgNames.map(name => preloadBackground(name)));
    console.log('背景图预加载完成');
}

// 当前显示的立绘状态
let currentCharacters = {
    left: null,
    right: null
};

// 设置人物立绘 - 棠棣之华风格（支持双角色同时显示）
function setCharacter(characterName, expression, position, isSpeaking = false) {
    const leftContainer = document.getElementById('character-left');
    const rightContainer = document.getElementById('character-right');

    if (!leftContainer || !rightContainer) {
        console.error('立绘容器未找到');
        return;
    }

    // 如果position为null，清空对应位置
    if (!characterName) {
        if (position === 'left') {
            leftContainer.innerHTML = '';
            currentCharacters.left = null;
        } else if (position === 'right') {
            rightContainer.innerHTML = '';
            currentCharacters.right = null;
        } else {
            // 清空所有
            leftContainer.innerHTML = '';
            rightContainer.innerHTML = '';
            currentCharacters.left = null;
            currentCharacters.right = null;
        }
        return;
    }

    const charSprites = spriteMap[characterName];
    if (!charSprites) {
        console.warn('角色未在spriteMap中找到:', characterName);
        return;
    }

    const spritePath = charSprites[expression] || charSprites['默认'];
    if (!spritePath) {
        console.warn('立绘路径未找到:', characterName, expression);
        return;
    }

    // 检查是否已有相同角色，避免重复创建
    const container = position === 'left' ? leftContainer : rightContainer;
    const currentChar = position === 'left' ? currentCharacters.left : currentCharacters.right;

    if (currentChar && currentChar.name === characterName && currentChar.expression === expression) {
        // 同一角色同一表情，只需更新说话状态
        const img = container.querySelector('.character-sprite');
        if (img) {
            if (isSpeaking) {
                img.classList.add('speaking');
            } else {
                img.classList.remove('speaking');
            }
        }
        return;
    }

    // 创建新立绘
    const img = document.createElement('img');
    img.className = 'character-sprite';

    // 清空容器并添加新立绘
    container.innerHTML = '';
    container.appendChild(img);

    // 更新状态
    if (position === 'left') {
        currentCharacters.left = { name: characterName, expression: expression };
    } else {
        currentCharacters.right = { name: characterName, expression: expression };
    }

    // 设置图片加载事件
    img.onload = () => {
        console.log('立绘加载成功:', spritePath);
        img.classList.add('show');
        if (isSpeaking) {
            img.classList.add('speaking');
        }
    };

    img.onerror = () => {
        console.error('立绘加载失败:', spritePath);
        // 尝试加载默认表情
        if (expression !== '默认' && charSprites['默认']) {
            img.src = charSprites['默认'];
        }
    };

    // 直接设置src，让浏览器加载
    img.src = spritePath;
    console.log('正在加载立绘:', spritePath);
}

// 快进功能
let isSkipping = false;
let skipSpeed = 50; // 快进时的文本显示速度(ms)

function skipToEnd() {
    isSkipping = !isSkipping;
    const skipBtn = document.getElementById('skip-btn');

    if (isSkipping) {
        skipBtn.textContent = '快进中 »»';
        skipBtn.style.color = '#d4af37';
        skipBtn.style.borderColor = '#d4af37';

        // 加快当前打字机效果
        if (typewriterInterval) {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
        }

        // 立即显示当前文本并快速推进
        const currentScene = storyScript[gameState.currentDialogueIndex];
        if (currentScene && currentScene.text) {
            const textEl = document.getElementById('dialogue-text');
            textEl.textContent = currentScene.text;
            textEl.dataset.typing = 'false';
        }

        // 自动快速推进剧情
        autoAdvance();
    } else {
        skipBtn.textContent = '快进 »';
        skipBtn.style.color = '';
        skipBtn.style.borderColor = '';
    }
}

// 自动推进剧情
function autoAdvance() {
    if (!isSkipping) return;

    const currentScene = storyScript[gameState.currentDialogueIndex];

    // 如果是选项，停止快进
    if (currentScene && currentScene.type === 'choice') {
        isSkipping = false;
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) {
            skipBtn.textContent = '快进 »';
            skipBtn.style.color = '';
            skipBtn.style.borderColor = '';
        }
        return;
    }

    advanceDialogue();

    // 继续自动推进
    if (isSkipping) {
        setTimeout(autoAdvance, skipSpeed);
    }
}

// 显示章节标题
function showChapterTitle(title, subtitle) {
    const titleEl = document.getElementById('chapter-title');
    if (!titleEl) return;

    document.getElementById('chapter-name').textContent = title;
    document.getElementById('chapter-subtitle').textContent = subtitle;

    titleEl.classList.add('show');

    setTimeout(() => {
        titleEl.classList.remove('show');
    }, 3000);
}

// 更新对话文本
function updateDialogue(speaker, text) {
    const speakerEl = document.getElementById('speaker-name');
    const textEl = document.getElementById('dialogue-text');

    if (!speakerEl || !textEl) return;

    if (speaker) {
        speakerEl.textContent = speaker;
        speakerEl.style.display = 'block';
    } else {
        speakerEl.style.display = 'none';
    }

    // 打字机效果
    typewriterEffect(textEl, text);
}

// 打字机效果 - 支持快进
let typewriterInterval = null;
const NORMAL_SPEED = 35; // 正常打字速度
const FAST_SPEED = 10;   // 快进时的打字速度

function typewriterEffect(element, text) {
    // 清除之前的打字机效果
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
    }

    // 如果是快进模式，直接显示全部文本
    if (isSkipping) {
        element.textContent = text;
        element.dataset.typing = 'false';
        return;
    }

    element.textContent = '';
    element.dataset.typing = 'true';
    let index = 0;

    const speed = isSkipping ? FAST_SPEED : NORMAL_SPEED;

    typewriterInterval = setInterval(() => {
        if (isSkipping) {
            // 快进模式下立即完成
            clearInterval(typewriterInterval);
            typewriterInterval = null;
            element.textContent = text;
            element.dataset.typing = 'false';
            return;
        }

        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
            element.dataset.typing = 'false';
        }
    }, speed);
}

// 显示选项
function showChoices(choices) {
    const container = document.getElementById('choices-container');
    if (!container) return;

    container.innerHTML = '';

    choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.onclick = () => handleChoice(choice);
        container.appendChild(btn);
    });

    container.classList.add('show');
}

// 处理选择
function handleChoice(choice) {
    // 隐藏选项
    const container = document.getElementById('choices-container');
    if (container) {
        container.classList.remove('show');
    }

    // 应用效果
    const changes = {};
    if (choice.effect) {
        Object.entries(choice.effect).forEach(([key, value]) => {
            if (gameState.stats[key] !== undefined) {
                gameState.stats[key] = Math.max(0, Math.min(100, gameState.stats[key] + value));
                changes[key] = value;
            }
        });
    }

    // 更新UI
    updateStatsUI(changes);

    // 跳转到下一场景
    if (choice.next) {
        const nextIndex = storyScript.findIndex(s => s.id === choice.next);
        if (nextIndex !== -1) {
            gameState.currentDialogueIndex = nextIndex;
            renderScene();
        } else {
            // 如果找不到跳转目标，推进到下一个场景
            console.warn('跳转目标未找到:', choice.next);
            gameState.currentDialogueIndex++;
            renderScene();
        }
    } else {
        gameState.currentDialogueIndex++;
        renderScene();
    }
}

// 渲染场景
function renderScene() {
    if (gameState.currentDialogueIndex >= storyScript.length) {
        showEnding('ending_bad');
        return;
    }

    const scene = storyScript[gameState.currentDialogueIndex];

    // 预加载下一场景可能需要的图片
    preloadNextSceneImages();

    switch (scene.type) {
        case 'chapter':
            // 章节标题
            gameState.currentChapter = scene.title;
            document.getElementById('chapter-value').textContent = scene.title;
            showChapterTitle(scene.title, scene.subtitle);

            if (scene.bgm) {
                playBGM(scene.bgm);
            }
            if (scene.background) {
                setBackground(scene.background);
            }

            // 自动进入下一段
            setTimeout(() => {
                gameState.currentDialogueIndex++;
                renderScene();
            }, 2500);
            break;

        case 'narration':
            // 旁白 - 清除所有角色高亮，但保留立绘
            if (scene.background) {
                setBackground(scene.background);
            }
            // 清除所有角色的说话状态
            document.querySelectorAll('.character-sprite').forEach(img => {
                img.classList.remove('speaking');
            });
            updateDialogue(null, scene.text);
            break;

        case 'dialogue':
            // 对话 - 高亮说话角色
            if (scene.background) {
                setBackground(scene.background);
            }
            updateDialogue(scene.speaker, scene.text);

            // 确定角色名称：优先使用 character，否则尝试从 speaker 解析
            let charName = scene.character;
            if (!charName && scene.speaker) {
                // 从 speaker 解析角色名（去掉括号内容）
                charName = scene.speaker.split(/[（(]/)[0].trim();
            }

            // 确定位置
            let charPos = scene.position || 'left';

            // 确定表情
            let charExpr = scene.expression || '默认';

            // 显示说话角色
            if (charName && spriteMap[charName]) {
                setCharacter(charName, charExpr, charPos, true);
            }

            // 如果对话有对立角色，保持显示但不高亮
            if (scene.oppositeCharacter) {
                const oppositePosition = charPos === 'left' ? 'right' : 'left';
                setCharacter(scene.oppositeCharacter, '默认', oppositePosition, false);
            }
            break;

        case 'monologue':
            // 内心独白 - 不高亮
            if (scene.background) {
                setBackground(scene.background);
            }
            updateDialogue(scene.speaker, scene.text);

            // 确定角色名称
            let monoCharName = scene.character;
            if (!monoCharName && scene.speaker) {
                monoCharName = scene.speaker.split(/[（(]/)[0].trim();
            }

            let monoPos = scene.position || 'left';
            let monoExpr = scene.expression || '默认';

            if (monoCharName && spriteMap[monoCharName]) {
                setCharacter(monoCharName, monoExpr, monoPos, false);
            }
            break;

        case 'choice':
            // 选项
            updateDialogue(null, scene.text);
            showChoices(scene.choices);
            break;

        case 'ending_check':
            // 结局判定
            checkEnding(scene.endings);
            break;

        case 'ending':
            // 结局
            showEnding(scene.id);
            break;

        default:
            gameState.currentDialogueIndex++;
            renderScene();
    }
}

// 判定结局
function checkEnding(endings) {
    for (const ending of endings) {
        if (ending.condition(gameState.stats)) {
            const endingIndex = storyScript.findIndex(s => s.id === ending.id);
            if (endingIndex !== -1) {
                gameState.currentDialogueIndex = endingIndex;
                renderScene();
                return;
            }
        }
    }
    // 如果没有满足任何结局条件，默认显示普通结局
    const defaultEndingIndex = storyScript.findIndex(s => s.id === 'ending_normal');
    if (defaultEndingIndex !== -1) {
        gameState.currentDialogueIndex = defaultEndingIndex;
        renderScene();
    }
}

// 显示结局
function showEnding(endingId) {
    const ending = storyScript.find(s => s.id === endingId);
    if (!ending) return;

    // 设置背景和BGM
    if (ending.background) {
        setBackground(ending.background);
    }
    if (ending.bgm) {
        playBGM(ending.bgm);
    }

    // 显示结局界面
    const endingScreen = document.getElementById('ending-screen');
    if (!endingScreen) return;

    document.getElementById('ending-title').textContent = ending.title;

    if (ending.content) {
        document.getElementById('ending-text').innerHTML = ending.content
            .map(line => '<p>' + line + '</p>')
            .join('');
    }

    // 显示最终数值
    const statsHtml = `
        <div style="margin-bottom: 10px; color: #d4af37;">最终数值</div>
        <div>靖王信任: ${gameState.stats.trust}</div>
        <div>景睿好感: ${gameState.stats.jingrui}</div>
        <div>夏江怀疑: ${gameState.stats.suspicion}</div>
        <div>身体状态: ${gameState.stats.health}</div>
    `;
    document.getElementById('ending-stats').innerHTML = statsHtml;

    endingScreen.classList.add('active');
}

// 推进对话 - 棠棣之华风格
function advanceDialogue() {
    // 如果正在显示选项，不推进
    const choicesContainer = document.getElementById('choices-container');
    if (choicesContainer && choicesContainer.classList.contains('show')) {
        return;
    }

    // 如果正在显示章节标题，跳过
    const chapterTitle = document.getElementById('chapter-title');
    if (chapterTitle && chapterTitle.classList.contains('show')) {
        chapterTitle.classList.remove('show');
    }

    // 如果正在打字机效果中，立即完成当前文本
    const textEl = document.getElementById('dialogue-text');
    if (textEl && textEl.dataset.typing === 'true') {
        const currentScene = storyScript[gameState.currentDialogueIndex];
        if (currentScene && currentScene.text) {
            textEl.dataset.typing = 'false';
            textEl.textContent = currentScene.text;
        }
        // 清除打字机interval
        if (typewriterInterval) {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
        }
        return;
    }

    const currentScene = storyScript[gameState.currentDialogueIndex];
    if (!currentScene) return;

    // 如果是选项类型，不自动推进
    if (currentScene.type === 'choice') {
        return;
    }

    // 清除当前说话角色的高亮
    document.querySelectorAll('.character-sprite').forEach(img => {
        img.classList.remove('speaking');
    });

    // 如果有next字段，跳转到指定场景
    if (currentScene.next) {
        const nextIndex = storyScript.findIndex(s => s.id === currentScene.next);
        if (nextIndex !== -1) {
            gameState.currentDialogueIndex = nextIndex;
            renderScene();
            return;
        }
    }

    // 推进到下一个场景（跳过只有id的中间标记场景）
    let nextIndex = gameState.currentDialogueIndex + 1;
    while (nextIndex < storyScript.length) {
        const nextScene = storyScript[nextIndex];
        // 跳过只有id没有其他内容的场景（这些通常是跳转目标标记）
        if (nextScene && Object.keys(nextScene).length <= 1 && nextScene.id) {
            nextIndex++;
            continue;
        }
        break;
    }

    gameState.currentDialogueIndex = nextIndex;
    renderScene();
}

// 键盘快捷键支持
document.addEventListener('keydown', (e) => {
    // 空格键或回车键推进剧情
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advanceDialogue();
    }
    // ESC键取消快进
    if (e.code === 'Escape' && isSkipping) {
        isSkipping = false;
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) {
            skipBtn.textContent = '快进 »';
            skipBtn.style.color = '';
            skipBtn.style.borderColor = '';
        }
    }
    // Ctrl键按住时快进
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        if (!isSkipping) {
            skipToEnd();
        }
    }
});

document.addEventListener('keyup', (e) => {
    // 松开Ctrl停止快进
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        if (isSkipping) {
            skipToEnd();
        }
    }
});

// 重新开始
function restartGame() {
    document.getElementById('ending-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('start-screen').classList.remove('hidden');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initCharacterScreen();
});
