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

const app = express();
app.use(express.json());
const port = 3000;

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
    const { department, courses } = req.body;
    const courseData = fs.readFileSync(path.join(__dirname, 'tmp', 'courseData.json'), 'utf-8');
    const coursesJson = JSON.parse(courseData);
    const selectedCourses = coursesJson.filter(course => courses.includes(course.id));
    const filteredCourses = selectedCourses.map(course => {
        const filteredSections = course.sections.filter(section => {
            return section.schedules.some(schedule => {
                const departments = schedule.department.split(', ');
                return departments.includes(department);
            });
        });
        return { ...course, sections: filteredSections };
    }).filter(course => course.sections.length > 0);

    console.log(`Filtered Results: ${selectedCourses.length} courses`);
    console.log(filteredCourses);

    let svg = "";
    res.send(svg);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});