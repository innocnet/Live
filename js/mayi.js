const cheerio = createCheerio()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const appConfig = {
    ver: 1,
    title: '蚂蚁影视',
    site: 'https://www.mayi520.org',
    tabs: [
        { name: '电影', ext: { id: 1 } },
        { name: '连续剧', ext: { id: 2 } },
        { name: '综艺', ext: { id: 3 } },
        { name: '动漫', ext: { id: 4 } },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let { id, page = 1 } = ext
    let cards = []

    const url = `${appConfig.site}/vodshow/${id}--------${page}---.html`
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
    const $ = cheerio.load(data)

    $('.stui-vodlist__box').each((_, e) => {
        const href = $(e).find('.stui-vodlist__detail h4 a').attr('href')
        const title = $(e).find('.stui-vodlist__detail h4 a').attr('title')
        const cover = $(e).find('.stui-vodlist__thumb').attr('data-original')
        const remarks = $(e).find('.pic-text').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: { url: href },
        })
    })

    return jsonify({ list: cards })
}

async function search(ext) {
    ext = argsify(ext)
    let page = ext.page || 1
    if (page > 1) return jsonify({ list: [] })

    let cards = []
    const text = encodeURIComponent(ext.text)
    const url = `${appConfig.site}/vodsearch/-------------.html?wd=${text}`
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
    const $ = cheerio.load(data)

    $('.stui-vodlist__media > li').each((_, e) => {
        const href = $(e).find('.detail h3 a').attr('href')
        const title = $(e).find('.detail h3 a').text().trim()
        const cover = $(e).find('.thumb a').attr('data-original')
        const remarks = $(e).find('.pic-text').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: { url: href },
        })
    })

    return jsonify({ list: cards })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const url = appConfig.site + ext.url
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
    const $ = cheerio.load(data)

    let names = {}
    $('.play_source .btn.title').each((_, e) => {
        names[$(e).attr('data-mid')] = $(e).text().trim()
    })

    let groups = []
    $('.play_source_list_item').each((_, e) => {
        const mid = $(e).attr('data-mid')
        let tracks = []
        $(e).find('li a').each((_, a) => {
            tracks.push({
                name: $(a).text().trim(),
                ext: { url: $(a).attr('href') },
            })
        })
        groups.push({ title: names[mid] || `线路${mid}`, tracks })
    })

    return jsonify({ list: groups })
}

// 播放地址被站方自定义加密，借助其官方解析服务解出真实 m3u8 地址
async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = appConfig.site + ext.url
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })

    const match = data.match(/var player_data\s*=\s*(\{.*?\})<\/script>/)
    if (!match) return jsonify({ urls: [] })

    const playerData = JSON.parse(match[1])
    const decodeUrl = `https://zj.sp-flv.com:8443?url=${playerData.url}`
    const { data: decodeData } = await $fetch.get(decodeUrl, { headers: { 'User-Agent': UA } })
    const urlMatch = decodeData.match(/video_url\s*=\s*'([^']+)'/)
    const videoUrl = urlMatch ? urlMatch[1] : ''

    return jsonify({ urls: videoUrl ? [videoUrl] : [] })
}
