import sequelize from "./src/backEnd/dataBase/index.js";
import SubjectRestrictions from "./src/backEnd/dataBase/models/schedule/subjectsRestrictions.js";

async function test() {
  try {
    const restrictions = await SubjectRestrictions.findAll({
      raw: true,
      limit: 1,
    });
    console.log("TYPE OF CLASSROOM_IDS:", typeof restrictions[0].classroom_ids);
    console.log("VALUE:", restrictions[0].classroom_ids);
    console.log("Array.isArray?", Array.isArray(restrictions[0].classroom_ids));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();

