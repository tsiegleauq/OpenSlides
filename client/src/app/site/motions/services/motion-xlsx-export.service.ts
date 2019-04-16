import { Injectable } from '@angular/core';

import { Workbook, Worksheet } from 'exceljs/dist/exceljs.min.js';

import { InfoToExport } from './motion-pdf.service';
import { MotionRepositoryService } from 'app/core/repositories/motions/motion-repository.service';
import { TranslateService } from '@ngx-translate/core';
import { ViewMotion } from '../models/view-motion';
import { XlsxExportServiceService, CellFillingDefinition } from 'app/core/ui-services/xlsx-export-service.service';

/**
 * Service to export motion elements to XLSX
 */
@Injectable({
    providedIn: 'root'
})
export class MotionXlsxExportService {
    /**
     * Defines the head row style
     */
    private headRowFilling: CellFillingDefinition = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
            argb: 'FFFFE699'
        },
        bgColor: {
            argb: 'FFFFE699'
        }
    };

    /**
     * Constructor
     *
     * @param xlsx XlsxExportServiceService
     * @param translate translationService
     * @param motionRepo MotionRepositoryService
     */
    public constructor(
        private xlsx: XlsxExportServiceService,
        private translate: TranslateService,
        private motionRepo: MotionRepositoryService
    ) {}

    /**
     * Export motions as XLSX
     *
     * @param motions
     * @param contentToExport
     * @param infoToExport
     */
    public exportMotionList(motions: ViewMotion[], infoToExport: InfoToExport[]): void {
        const workbook = new Workbook();
        const properties = ['identifier', 'title'].concat(infoToExport);
        const worksheet = workbook.addWorksheet(this.translate.instant('Motions'), {
            pageSetup: {
                paperSize: 9,
                orientation: 'portrait',
                fitToPage: true,
                fitToHeight: 5,
                fitToWidth: properties.length,
                printTitlesRow: '1:1'
            }
        });

        // if the ID was exported as well, shift it to the first position
        if (properties[properties.length - 1] === 'id') {
            properties.unshift(properties.pop());
        }

        worksheet.columns = properties.map(property => {
            return {
                header: this.translate.instant(property.charAt(0).toLocaleUpperCase() + property.slice(1))
            };
        });

        worksheet.getRow(1).eachCell(cell => {
            cell.font = {
                underline: true,
                bold: true
            };
            cell.fill = this.headRowFilling;
        });

        // map motion data to properties
        const motionData = motions.map(motion =>
            properties.map(property => {
                const motionProp = motion[property];
                if (motionProp) {
                    switch (property) {
                        case 'state':
                            return this.motionRepo.getExtendedStateLabel(motion);
                        case 'recommendation':
                            return this.motionRepo.getExtendedRecommendationLabel(motion);
                        default:
                            return this.translate.instant(motionProp.toString());
                    }
                } else {
                    return '';
                }
            })
        );

        // add to sheet
        for (const motion of motionData) {
            worksheet.addRow(motion);
        }

        this.xlsx.autoSize(worksheet, 0);
        this.xlsx.saveXlsx(workbook, this.translate.instant('Motions'));
    }

    /**
     * Custom motion exporter as overview table
     */
    public exportMotionOverview(motions: ViewMotion[]): void {
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet(this.translate.instant('Motions'), {
            pageSetup: { paperSize: 9, orientation: 'landscape', printTitlesRow: '9:9' }
        });

        const title = 'Antragsübersicht';
        const subtitle = `Stand: ${new Date().toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })}`;
        const properties = ['Sequential number', 'Submitter', 'Title', 'Category'];

        // Cell positions
        const titlePos = 'A3';
        const subtitlePos = 'A7';
        const lastColumn = 'D';

        // the row number when the motion table starts
        const firstTableRowIndex = 10;
        const rowHeight = 15;
        const subtitleRowHeight = 20;

        // set the width of the columns
        worksheet.columns = [{ width: 18 }, { width: 20 }, { width: 60 }, { width: 12 }];

        // two empty rows
        worksheet.addRow([]);
        worksheet.addRow([]);

        // Title row and formating
        worksheet.addRow([title]).font = {
            size: 16,
            bold: true
        };

        // style the title cell
        const titleCell = worksheet.getCell(titlePos);
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: 'FFFF0000'
            },
            bgColor: {
                argb: 'FFFF0000'
            }
        };

        titleCell.border = {
            top: {
                style: 'thick'
            },
            left: {
                style: 'thick'
            },
            bottom: {
                style: 'thick'
            },
            right: {
                style: 'thick'
            }
        };

        titleCell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
        };

        // merge the title cell
        worksheet.mergeCells(`${titlePos}:${lastColumn}5`);

        // empty row
        worksheet.addRow([]);

        // Add the subtitle
        const subtitleRow = worksheet.addRow([subtitle]);
        subtitleRow.font = {
            size: 16,
            bold: true
        };
        subtitleRow.height = subtitleRowHeight;

        // align subtitle
        worksheet.getCell(subtitlePos).alignment = {
            vertical: 'middle',
            horizontal: 'center'
        };

        worksheet.mergeCells(`${subtitlePos}:${lastColumn}7`);

        // empty row
        worksheet.addRow([]);

        // add and style header row
        worksheet.addRow(properties.map(property => this.translate.instant(property))).eachCell(cell => {
            cell.fill = this.headRowFilling;
            cell.border = {
                top: {
                    style: 'thin'
                },
                left: {
                    style: 'thin'
                },
                bottom: {
                    style: 'thin'
                },
                right: {
                    style: 'thin'
                }
            };
        });

        // add motion info to sheet
        for (const motion of motions) {
            const submitters = motion.submitters.join(', ');

            const motionRow = worksheet.addRow([
                motion.id,
                submitters,
                motion.title,
                motion.category ? motion.category.prefix : ''
            ]);

            motionRow.eachCell(cell => {
                cell.border = {
                    top: {
                        style: 'thin'
                    },
                    left: {
                        style: 'thin'
                    },
                    bottom: {
                        style: 'thin'
                    },
                    right: {
                        style: 'thin'
                    }
                };
            });
            const titleRowFactor = this.xlsx.calcRowHeight(motion.title, worksheet.getColumn('C').width);
            const submitterRowFactor = this.xlsx.calcRowHeight(submitters, worksheet.getColumn('B').width);

            motionRow.height = rowHeight * Math.max(titleRowFactor, submitterRowFactor);
        }

        // align the table
        for (let rowIndex = firstTableRowIndex; rowIndex < motions.length + firstTableRowIndex; rowIndex++) {
            this.alignTableCells(['A', 'D'], rowIndex, worksheet, 'center');
            this.alignTableCells(['B', 'C'], rowIndex, worksheet, 'left');
        }

        this.xlsx.saveXlsx(workbook, 'Antragsübersicht');
    }

    /**
     * Helper function to align the motion table cells.
     *
     * @param columns The columns to align
     * @param row the row number to align
     * @param worksheet worksheet to manipulate
     * @param horizontal horizontal alignment
     */
    private alignTableCells(columns: string[], row: number, worksheet: Worksheet, horizontal: 'left' | 'center'): void {
        for (const col of columns) {
            worksheet.getCell(`${col}${row}`).alignment = {
                wrapText: true,
                vertical: 'middle',
                horizontal: horizontal
            };
        }
    }
}
