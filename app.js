const fs = require('fs');
const path = require('path');
const express = require('express');

async function getCourseData() {
    const url = 'https://schedule.atilim.edu.tr/public/courses';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(JSON.stringify({ error: 'Network response was not ok', statusText: response.statusText, statusCode: response.status }));
        }
        const data = await response.json();
        const filePath = path.join(__dirname, 'tmp', 'courseData.json');
        let localData = null;

        if (fs.existsSync(filePath)) {
            const localFileContent = fs.readFileSync(filePath, 'utf-8');
            localData = JSON.parse(localFileContent);
        }
        if (JSON.stringify(localData) === JSON.stringify(data)) {
            console.log(JSON.stringify({ message: 'Data has not changed. No need to save.', statusCode: 304 }));
            return;
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(JSON.stringify({ message: 'Data has been saved to courseData.json', statusCode: 200 }));
        } catch (error) {
        console.error(JSON.stringify({ error: 'There has been a problem with your fetch operation', details: error.message, statusCode: error.statusCode || 500 }));
    }
}

async function getDepartmentData() {
    const url = 'https://schedule.atilim.edu.tr/public/departments';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(JSON.stringify({ error: 'Network response was not ok', statusText: response.statusText, statusCode: response.status }));
        }
        const data = await response.json();
        const filePath = path.join(__dirname, 'tmp', 'departmentData.json');
        let localData = null;

        if (fs.existsSync(filePath)) {
            const localFileContent = fs.readFileSync(filePath, 'utf-8');
            localData = JSON.parse(localFileContent);
        }
        if (JSON.stringify(localData) === JSON.stringify(data)) {
            console.log(JSON.stringify({ message: 'Data has not changed. No need to save.', statusCode: 304 }));
            return;
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(JSON.stringify({ message: 'Data has been saved to departmentData.json', statusCode: 200 }));
    } catch (error) {
        console.error(JSON.stringify({ error: 'There has been a problem with your fetch operation', details: error.message, statusCode: error.statusCode || 500 }));
    }
}

if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'));
}

getCourseData();
getDepartmentData();

setInterval(() => {
    getCourseData();
    getDepartmentData();
}, 15 * 60 * 1000);

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/departments', (req, res) => {
    const departmentData = fs.readFileSync(path.join(__dirname, 'tmp', 'departmentData.json'), 'utf-8');
    res.json(JSON.parse(departmentData));
});

app.get('/api/courses', (req, res) => {
    const courseData = fs.readFileSync(path.join(__dirname, 'tmp', 'courseData.json'), 'utf-8');
    res.json(JSON.parse(courseData));
});

app.post('/api/schedule', (req, res) => {
    const { department, courses, showConflicts, filterByDepartment } = req.body;
    const courseData = fs.readFileSync(path.join(__dirname, 'tmp', 'courseData.json'), 'utf-8');
    const coursesJson = JSON.parse(courseData);
    const selectedCourses = coursesJson.filter(course => courses.includes(course.id));

    let filteredCourses = selectedCourses.map(course => {
        const filteredSections = course.sections.filter(section => {
            return section.schedules.some(schedule => {
                if (filterByDepartment) {
                    const departments = schedule.department.split(', ');
                    return departments.includes(department);
                }
                return true;
            });
        });
        return { ...course, sections: filteredSections };
    }).filter(course => course.sections.length > 0);

    let courseSections = filteredCourses.map(course => course.sections);
    let combinations = cartesianProduct(courseSections);

    let templateSvg = fs.readFileSync(path.join(__dirname, 'template.svg'), 'utf-8');

    let validCombinations = combinations;
    if (!showConflicts) {
        validCombinations = combinations.filter(isValidCombination);
    }

    svgs = [];

    validCombinations.forEach((combination, index) => {
        let svg = templateSvg;

        // Çakışmaları bulalım
        const conflicts = findConflicts(combination);

        combination.forEach((section, courseIndex) => {
            section.schedules.forEach(schedule => {
                const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
                const gun = gunler.indexOf(schedule.day);
                const period = parseInt(schedule.period) - 1;
                const duration = parseInt(schedule.duration);

                let genislik = 232.75;
                let yukseklik = 305.75;
                let x = 345;
                let y = 420;

                const colors = ['#FFC0CB', '#ADD8E6', '#90EE90', '#FFB6C1', '#FFD700', '#FFA07A', '#20B2AA', '#87CEFA', '#778899', '#B0C4DE'];

                // Çakışma olup olmadığını kontrol et
                const isConflict = conflicts.some(conflict => conflict.schedule === schedule);
                const color = isConflict ? '#FF0000' : colors[courseIndex % colors.length];

                let lecture = `<rect x="${x + period * genislik}" y="${y + gun * yukseklik}" width="${duration * genislik}" height="${yukseklik}" fill="${color}" stroke-width="2"/>`;
                lecture += `<text x="${(x + period * genislik) + ((duration * genislik) / 2)}" y="${(y + gun * yukseklik) + 100}" font-size="40" text-rendering="geometricPrecision" text-anchor="middle" dominant-baseline="text-before-edge" style="font-weight: bold; pointer-events: none; white-space: pre; font-family: Arial;">${filteredCourses[courseIndex].id} - ${section.id}</text>`;
                lecture += `<text x="${(x + period * genislik) + ((duration * genislik) / 2)}" y="${(y + gun * yukseklik) + 232.25}" font-size="30" text-rendering="geometricPrecision" text-anchor="middle" dominant-baseline="text-after-edge" style="pointer-events: none; white-space: pre; font-weight: bold; font-family: Arial;">${schedule.classroom}</text>`;
                svg = svg.replace('</g></svg>', lecture + '</g></svg>');
            });
        });
        svgs.push(svg);
    });

    res.send(svgs);
});

// Çakışmaları bulan fonksiyon
function findConflicts(combination) {
    let scheduleMap = {};
    let conflicts = [];
    for (let section of combination) {
        for (let schedule of section.schedules) {
            const gun = schedule.day;
            const period = parseInt(schedule.period);
            const duration = parseInt(schedule.duration);
            if (!scheduleMap[gun]) {
                scheduleMap[gun] = [];
            }
            const start = period;
            const end = period + duration - 1;
            for (let existing of scheduleMap[gun]) {
                if (Math.max(start, existing.start) <= Math.min(end, existing.end)) {
                    conflicts.push({ section, schedule });
                }
            }
            scheduleMap[gun].push({ start, end });
        }
    }
    return conflicts;
}

function cartesianProduct(arr) {
    return arr.reduce((acc, val) => {
        return acc.flatMap(d => val.map(v => [...d, v]));
    }, [[]]);
}

function isValidCombination(combination) {
    let scheduleMap = {};
    for (let section of combination) {
        for (let schedule of section.schedules) {
            const gun = schedule.day;
            const period = parseInt(schedule.period);
            const duration = parseInt(schedule.duration);
            if (!scheduleMap[gun]) {
                scheduleMap[gun] = [];
            }
            const start = period;
            const end = period + duration - 1;
            for (let existing of scheduleMap[gun]) {
                if (Math.max(start, existing.start) <= Math.min(end, existing.end)) {
                    return false;
                }
            }
            scheduleMap[gun].push({ start, end });
        }
    }
    return true;
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});