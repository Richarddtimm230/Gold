const mongoose = require('mongoose');
const Class = require('./models/Class');
const Subject = require('./models/Subject');

const MONGO_URI = process.env.MONGO_URI || 'your-mongodb-connection-string';

async function migrate() {
  await mongoose.connect(MONGO_URI);

  const classes = await Class.find().populate('subjects.subject');
  let updatedCount = 0;
  for (const cls of classes) {
    for (const subjObj of cls.subjects) {
      let subjectId = subjObj.subject && subjObj.subject._id ? subjObj.subject._id : subjObj.subject;
      if (!subjectId) continue;

      let subject = await Subject.findById(subjectId);
      if (!subject) continue;

      if (!subject.class || String(subject.class) !== String(cls._id)) {
        subject.class = cls._id;
        await subject.save();
        updatedCount++;
        console.log(`Updated Subject "${subject.name}" (${subject._id}) with class ${cls.name} (${cls._id})`);
      }
    }
  }

  console.log(`Migration complete. ${updatedCount} subjects updated.`);
  await mongoose.disconnect();
}

migrate();
