import prisma from './src/utils/prismaClient';
import bcrypt from 'bcryptjs';

async function runMasterDataTest() {
  console.log('=== STARTING MASTER DATA & TEAM FLOW INTEGRATION TEST ===');

  try {
    // 1. Clean up existing test entities if present
    const testEmployeeId = 'TEST_EMP_99';
    await prisma.user.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.section.deleteMany({ where: { name: { in: ['Extrusion', 'Moulding', 'Common'] } } });

    // 2. Create Multiple Sections
    console.log('\n[STEP 1] Creating Sections: Extrusion, Moulding, Common...');
    const sectionExtrusion = await prisma.section.create({ data: { name: 'Extrusion', description: 'Extrusion Section' } });
    const sectionMoulding = await prisma.section.create({ data: { name: 'Moulding', description: 'Moulding Section' } });
    const sectionCommon = await prisma.section.create({ data: { name: 'Common', description: 'Common Department Teams' } });
    console.log(`✓ Sections Created: ${sectionExtrusion.name}, ${sectionMoulding.name}, ${sectionCommon.name}`);

    // 3. Create Teams across Multiple Sections
    console.log('\n[STEP 2] Creating Teams across Sections...');
    const teamA = await prisma.team.create({ data: { name: 'Automation Team', sectionId: sectionExtrusion.id } });
    const teamB = await prisma.team.create({ data: { name: 'Digital Team', sectionId: sectionExtrusion.id } });
    const teamC = await prisma.team.create({ data: { name: 'Maintenance Team', sectionId: sectionMoulding.id } });
    const teamD = await prisma.team.create({ data: { name: 'IT Support', sectionId: sectionCommon.id } });
    console.log(`✓ Teams Created:\n  - ${sectionExtrusion.name}: ${teamA.name}, ${teamB.name}\n  - ${sectionMoulding.name}: ${teamC.name}\n  - ${sectionCommon.name}: ${teamD.name}`);

    // 4. Verify Teams API query (returns all active teams grouped with section data)
    console.log('\n[STEP 3] Querying all teams from database...');
    const allTeams = await prisma.team.findMany({
      include: { section: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`✓ Total Teams Retrieved: ${allTeams.length}`);
    if (allTeams.length < 4) throw new Error('Teams query failed to fetch all active teams across sections');

    // 5. Create Test User and Assign Multiple Teams across Multiple Sections
    console.log('\n[STEP 4] Registering User & Assigning Teams across Sections...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        employeeId: testEmployeeId,
        name: 'Multi-Section Tester',
        email: 'test_multisection@example.com',
        password: hashedPassword,
        role: 'TEAM_MEMBER',
        isApproved: true
      }
    });

    const selectedTeamIds = [teamA.id, teamC.id, teamD.id]; // Extrusion, Moulding, Common
    const parentTeams = await prisma.team.findMany({
      where: { id: { in: selectedTeamIds } },
      select: { sectionId: true }
    });
    const parentSectionIds = Array.from(new Set(parentTeams.map(t => t.sectionId)));

    await prisma.$transaction([
      prisma.userSectionMapping.deleteMany({ where: { userId: user.id } }),
      prisma.userTeamMapping.deleteMany({ where: { userId: user.id } }),
      prisma.userSectionMapping.createMany({
        data: parentSectionIds.map(sectionId => ({ userId: user.id, sectionId }))
      }),
      prisma.userTeamMapping.createMany({
        data: selectedTeamIds.map(teamId => ({ userId: user.id, teamId }))
      })
    ]);
    console.log(`✓ User Mapped to ${selectedTeamIds.length} Teams across ${parentSectionIds.length} Sections`);

    // 6. Verify User Relational Mappings
    console.log('\n[STEP 5] Verifying User Mappings in Database...');
    const mappedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        teams: { include: { team: { include: { section: true } } } },
        sections: { include: { section: true } }
      }
    });

    console.log(`User Name: ${mappedUser?.name}`);
    console.log('Assigned Sections:', mappedUser?.sections.map(s => s.section.name).join(', '));
    console.log('Assigned Teams:', mappedUser?.teams.map(t => `${t.team.name} (${t.team.section.name})`).join(', '));

    if ((mappedUser?.teams.length || 0) !== 3) throw new Error('Failed to map user to all selected teams!');
    if ((mappedUser?.sections.length || 0) !== 3) throw new Error('Failed to auto-inherit parent sections!');

    console.log('\n=== TEST SUCCESSFUL: ALL MULTI-SECTION & MULTI-TEAM VERIFICATIONS PASSED ===\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMasterDataTest();
