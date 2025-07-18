const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class ExportService {
    constructor() {
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    }

    async generatePDF(analysisData) {
        try {
            if (!analysisData || !analysisData.score) {
                throw new Error('Invalid analysis data');
            }

            const doc = new PDFDocument();
            
            // Add content to PDF with null checks
            doc.fontSize(25).text('SEO Analysis Report', { align: 'center' });
            doc.moveDown();
            
            // Overall Score
            doc.fontSize(16).text(`Overall Score: ${analysisData.score || 'N/A'}`);
            doc.moveDown();

            // Meta Analysis
            doc.fontSize(14).text('Meta Analysis');
            doc.fontSize(12).text(`Title: ${analysisData?.analysis?.meta?.title || 'N/A'}`);
            doc.text(`Description: ${analysisData?.analysis?.meta?.description || 'N/A'}`);
            doc.moveDown();

            // Content Analysis
            if (analysisData?.analysis?.content) {
                doc.fontSize(14).text('Content Analysis');
                doc.fontSize(12)
                    .text(`Word Count: ${analysisData.analysis.content.wordCount || 0}`)
                    .text(`Headings: H1 (${analysisData.analysis.content.headings?.h1 || 0}), H2 (${analysisData.analysis.content.headings?.h2 || 0}), H3 (${analysisData.analysis.content.headings?.h3 || 0})`);
            }

            return doc;
        } catch (error) {
            console.error('PDF generation error:', error);
            throw error;
        }
    }


    async generateCSV(analysisData) {
        const csvWriter = createCsvWriter({
            path: path.join(__dirname, '../../temp/analysis_report.csv'),
            header: [
                { id: 'category', title: 'Category' },
                { id: 'metric', title: 'Metric' },
                { id: 'value', title: 'Value' }
            ]
        });

        const records = [
            { category: 'Overall', metric: 'Score', value: analysisData.score },
            { category: 'Meta', metric: 'Title', value: analysisData.analysis.meta.title },
            { category: 'Meta', metric: 'Description', value: analysisData.analysis.meta.description },
            { category: 'Content', metric: 'Word Count', value: analysisData.analysis.content.wordCount },
            { category: 'Content', metric: 'H1 Count', value: analysisData.analysis.content.headings.h1 },
            { category: 'Content', metric: 'H2 Count', value: analysisData.analysis.content.headings.h2 },
            { category: 'Content', metric: 'H3 Count', value: analysisData.analysis.content.headings.h3 }
        ];

        await csvWriter.writeRecords(records);
        return path.join(__dirname, '../../temp/analysis_report.csv');
    }

    async sendEmailReport(email, analysisData) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });

        const emailTemplate = this.generateEmailTemplate(analysisData);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your SEO Analysis Report',
            html: emailTemplate
        };

        return await transporter.sendMail(mailOptions);
    }

    async generateExcel(analysisData) {
        try {
            if (!analysisData || !analysisData.score) {
                throw new Error('Invalid analysis data');
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('SEO Analysis');

            // Header Styling
            worksheet.getCell('A1').value = 'SEO Analysis Report';
            worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF4F46E5' } };
            worksheet.mergeCells('A1:C1');

            // Overall Score
            worksheet.getCell('A3').value = 'Overall Score:';
            worksheet.getCell('A3').font = { bold: true };
            worksheet.getCell('B3').value = analysisData.score;
            worksheet.getCell('B3').font = { size: 14, bold: true, color: { argb: 'FF059669' } };

            let row = 5;

            // Meta Analysis Section
            if (analysisData.analysis?.meta) {
                worksheet.getCell(`A${row}`).value = 'Meta Analysis';
                worksheet.getCell(`A${row}`).font = { size: 14, bold: true, color: { argb: 'FF4F46E5' } };
                row += 1;

                worksheet.getCell(`A${row}`).value = 'Title:';
                worksheet.getCell(`B${row}`).value = analysisData.analysis.meta.title || 'N/A';
                row += 1;

                worksheet.getCell(`A${row}`).value = 'Description:';
                worksheet.getCell(`B${row}`).value = analysisData.analysis.meta.description || 'Not provided';
                row += 2;
            }

            // Content Analysis Section
            if (analysisData.analysis?.content) {
                worksheet.getCell(`A${row}`).value = 'Content Analysis';
                worksheet.getCell(`A${row}`).font = { size: 14, bold: true, color: { argb: 'FF4F46E5' } };
                row += 1;

                worksheet.getCell(`A${row}`).value = 'Word Count:';
                worksheet.getCell(`B${row}`).value = analysisData.analysis.content.wordCount || 0;
                row += 1;

                if (analysisData.analysis.content.headings) {
                    worksheet.getCell(`A${row}`).value = 'H1 Count:';
                    worksheet.getCell(`B${row}`).value = analysisData.analysis.content.headings.h1 || 0;
                    row += 1;

                    worksheet.getCell(`A${row}`).value = 'H2 Count:';
                    worksheet.getCell(`B${row}`).value = analysisData.analysis.content.headings.h2 || 0;
                    row += 1;

                    worksheet.getCell(`A${row}`).value = 'H3 Count:';
                    worksheet.getCell(`B${row}`).value = analysisData.analysis.content.headings.h3 || 0;
                    row += 2;
                }
            }

            // Recommendations Section
            if (analysisData.recommendations && analysisData.recommendations.length > 0) {
                worksheet.getCell(`A${row}`).value = 'Recommendations';
                worksheet.getCell(`A${row}`).font = { size: 14, bold: true, color: { argb: 'FF4F46E5' } };
                row += 1;

                // Headers for recommendations table
                worksheet.getCell(`A${row}`).value = 'Priority';
                worksheet.getCell(`B${row}`).value = 'Type';
                worksheet.getCell(`C${row}`).value = 'Description';
                worksheet.getRow(row).font = { bold: true };
                row += 1;

                analysisData.recommendations.forEach(rec => {
                    const priorityColor = rec.priority === 'high' ? 'FFDC2626' : 
                                        rec.priority === 'medium' ? 'FFCA8A04' : 'FF2563EB';
                    
                    worksheet.getCell(`A${row}`).value = rec.priority || 'medium';
                    worksheet.getCell(`A${row}`).font = { color: { argb: priorityColor }, bold: true };
                    worksheet.getCell(`B${row}`).value = rec.type || 'general';
                    worksheet.getCell(`C${row}`).value = rec.description || rec.title || 'No description';
                    row += 1;
                });
            }

            // Auto-fit columns
            worksheet.columns.forEach(column => {
                column.width = 25;
            });

            const fileName = `seo-analysis-${Date.now()}.xlsx`;
            const filePath = path.join(__dirname, '../../temp', fileName);
            
            await workbook.xlsx.writeFile(filePath);
            return filePath;

        } catch (error) {
            console.error('Excel generation error:', error);
            throw error;
        }
    }

    async sendEmailReport(email, analysisData) {
        try {
            const emailService = require('./emailService');
            return await emailService.sendEmailReport(email, analysisData);
        } catch (error) {
            console.error('Email service error:', error);
            throw error;
        }
    }
}

module.exports = new ExportService();