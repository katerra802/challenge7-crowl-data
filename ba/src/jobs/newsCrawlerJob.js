// crawlTheGioiJob.js (ĐÃ CẬP NHẬT)

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs/promises');
const path = require('path');
const Articles = require('../models/article'); // Giả sử bạn có một model Articles để lưu trữ dữ liệu
const Category = require('../models/category'); // Giả sử bạn có một model Category để lưu trữ danh mục
const puppeteer = require('puppeteer');
const { logMessage } = require('../utils/logger');

// --- CẤU HÌNH CHO TRANG "tuoi tre" ---
const TARGET_URL = 'https://tuoitre.vn';
const OUTPUT_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tuoitre_thegioi.json');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';

const crawlData = {
    takeHtmlStructure: async (TARGET_URL, USER_AGENT) => {
        console.log(`[JOB START] Bắt đầu crawl tại ${TARGET_URL}`);

        const { data: html } = await axios.get(TARGET_URL, {
            headers: { 'User-Agent': USER_AGENT },
        });
        return html;
    },

    crawSlug: async (nameContainer, nameCategory, page) => {
        console.log(`[JOB START] Bắt đầu crawl tại ${TARGET_URL + nameCategory}`);

        try {
            await page.goto(TARGET_URL + nameCategory, { waitUntil: 'networkidle2' });

            console.log('[SUCCESS] Trang đã load xong.');

            const temp = await page.$$eval(
                nameContainer,
                items =>
                    items.map(item => {
                        const aTag = item.querySelector('a');
                        return aTag ? { slug: aTag.getAttribute('href') } : null;
                    }).filter(Boolean)
            );

            console.log(`[INFO] Đã crawl được tổng cộng ${temp.length} bài viết.`);

            if (temp.length === 0) {
                console.log('[WARN] Không tìm thấy bài viết nào. Có thể selector sai hoặc trang load chậm.');
                logMessage(`[WARN] Không tìm thấy bài viết nào tại ${TARGET_URL + nameCategory}`);
                return [];
            } else {
                return temp;
            }

        } catch (error) {
            console.error('[JOB FAILED] Đã xảy ra lỗi:', error.message);
            logMessage(`[ERROR] Lỗi crawl slug tại ${TARGET_URL + nameCategory}: ${error.message}`);
            return [];
        } finally {
            console.log(`[JOB END] Kết thúc job crawl slug.`);
        }
    },

    crawlArticleData: async (slug, idCategory, page) => {
        try {
            await page.goto(TARGET_URL + slug, { waitUntil: 'networkidle2' });

            const articleData = await page.evaluate(() => {
                const title = document.querySelector('h1')?.innerText.trim() || null;

                const subtitle = document.querySelector('.detail-sapo')?.innerText.trim() || null;

                const imgElement = document.querySelector('.VCSortableInPreviewMode img') ||
                    document.querySelector('.detail-thumbnail img');

                const imgSrc = imgElement?.getAttribute('src') || null;

                const paragraphs = Array.from(document.querySelectorAll('.detail-content p'))
                    .map(p => p.innerText.trim())
                    .filter(p => p.length > 0);

                return {
                    title,
                    sapo: subtitle,
                    image: imgSrc,
                    content: paragraphs,
                };
            });

            articleData.url = TARGET_URL + slug;
            articleData.category = idCategory;

            const newArticle = new Articles(articleData);

            return newArticle;

        } catch (error) {
            console.error('[JOB FAILED] Lỗi crawlArticleData:', error.message);
            logMessage(`[ERROR] Lỗi crawlArticleData tại ${TARGET_URL + slug}: ${error.message}`);
            return null;
        }
    },

    crawlAllArticles: async () => {
        const categories = await Category.find({});

        if (categories.length === 0) {
            console.log('[ERROR] Không có chuyên mục nào.');
            logMessage('[ERROR] Không có chuyên mục nào để crawl.');
            return;
        }

        console.log(`[JOB START] Bắt đầu crawl tất cả.`);

        const browser = await puppeteer.launch({ headless: true });

        try {
            for (const category of categories) {
                if (category.name === 'Video' || category.name === 'Trang chủ') continue;

                const page = await browser.newPage();

                const slugArticles = await crawlData.crawSlug(
                    'div#load-list-news div.box-category-item',
                    category.slug,
                    page
                );

                await page.close();

                if (slugArticles.length === 0) {
                    console.log(`[WARN] Không có bài viết nào cho category: ${category.name}`);
                    logMessage(`[WARN] Không có bài viết nào cho category: ${category.name}`);
                    continue;
                }

                // Crawl chi tiết từng bài
                for (const link of slugArticles) {
                    const check = await Articles.findOne({ url: TARGET_URL + link.slug });
                    if (!check) {
                        const detailPage = await browser.newPage();

                        const article = await crawlData.crawlArticleData(link.slug, category._id, detailPage);

                        await detailPage.close();

                        if (article) {
                            await article.save().catch(err => {
                                console.error(`[ERROR] Lỗi lưu bài "${article.title}": ${err.message}`);
                                logMessage(`[ERROR] Lỗi lưu bài "${article.title}": ${err.message}`);
                            });
                            console.log(`[SUCCESS] Đã crawl bài: ${article.title}`);
                        } else {
                            console.log(`[ERROR] Không crawl được slug: ${link.slug}`);
                            logMessage(`[ERROR] Không crawl được slug: ${link.slug}`);
                        }
                    }

                }
            }
        } catch (err) {
            console.error('[JOB FAILED] Lỗi tổng:', err.message);
            logMessage(`[ERROR] Lỗi tổng: ${err.message}`);
        } finally {
            await browser.close();
            console.log(`[JOB END] Kết thúc crawl.`)

        }
    },

    crawlCategory: async () => {
        console.log(`[JOB START] Bắt đầu crawl tại ${TARGET_URL}`);

        try {
            const { data: html } = await axios.get(TARGET_URL, {
                headers: { 'User-Agent': USER_AGENT },
            });
            console.log('[SUCCESS] Đã tải xong HTML.');

            const $ = cheerio.load(html);

            const categories = [];

            $('ul.menu-nav > li > a').each((index, element) => {
                const newsItem = $(element);

                // Lấy tiêu đề và URL
                const titleCategory = newsItem.text().trim();

                // Lấy đường dẫn (href)
                let slug = newsItem.attr('href');

                if (titleCategory && slug) {
                    const category = new Category({
                        name: titleCategory,
                        slug: slug
                    });
                    categories.push({ category: category });
                }
            });

            console.log(`[INFO] Đã crawl được tổng cộng ${categories.length} bài viết.`);

            if (categories.length > 0) {
                categories.forEach(async (item) => {
                    const category = item.category;
                    const check = await Category.findOne({ name: category.name });
                    if (check) {
                        console.log(`[INFO] Chuyên mục "${category.name}" đã tồn tại.`);
                        return;
                    }
                    await category.save()
                        .catch(err => {
                            console.error(`[ERROR] Không thể lưu chuyên mục "${category.name}":`, err.message);
                            logMessage(`[ERROR] Không thể lưu chuyên mục "${category.name}": ${err.message}`);
                        });
                    console.log(`[SUCCESS] Đã lưu bài viết: ${category.name + ' - ' + category.slug}`);
                });
            } else {
                console.log('[WARN] Không tìm thấy bài viết nào. Có thể cấu trúc website đã thay đổi.');
                logMessage('[WARN] Không tìm thấy bài viết nào tại ' + TARGET_URL);
            }

        } catch (error) {
            console.error('[JOB FAILED] Đã xảy ra lỗi trong quá trình crawl:', error.message);
            logMessage(`[ERROR] Lỗi crawlCategory tại ${TARGET_URL}: ${error.message}`);
        } finally {
            console.log(`[JOB END] Kết thúc job crawl chuyên mục ${TARGET_URL}.`);
        }
    },

    start: async () => {
        await crawlData.crawlCategory();
        await crawlData.crawlAllArticles();
    }
}
module.exports = crawlData;