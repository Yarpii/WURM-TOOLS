import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserProjects,
  getSharedProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectItems,
  addProjectItem,
  updateProjectItemProgress,
  removeProjectItem,
  getProjectMaterials,
  getUserAlliance,
} from "@/lib/database";
import type { CreateProjectInput, UpdateProjectInput, AddProjectItemInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("id");
    const action = searchParams.get("action");
    const allianceId = searchParams.get("alliance_id");

    // Get specific project
    if (projectId) {
      const project = await getProjectById(parseInt(projectId));
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // Check access (owner or shared alliance member)
      if (project.user_id !== result.user.id && !project.is_shared) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      if (action === "items") {
        const items = await getProjectItems(parseInt(projectId));
        return NextResponse.json(items);
      }

      if (action === "materials") {
        const materials = await getProjectMaterials(parseInt(projectId));
        return NextResponse.json(materials);
      }

      return NextResponse.json(project);
    }

    // Get shared alliance projects
    if (allianceId) {
      const projects = await getSharedProjects(parseInt(allianceId));
      return NextResponse.json(projects);
    }

    // Get user's own projects
    const projects = await getUserProjects(result.user.id);
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch projects: " + String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, project_id, ...data } = body;

    switch (action) {
      case "create": {
        const { name, description, is_shared } = data;

        if (!name || name.trim() === "") {
          return NextResponse.json(
            { error: "Project name is required" },
            { status: 400 }
          );
        }

        // If sharing, get user's alliance
        let allianceId: number | undefined;
        if (is_shared) {
          const alliance = getUserAlliance(result.user.id);
          if (alliance) {
            allianceId = alliance.id;
          }
        }

        const input: CreateProjectInput = {
          name: name.trim(),
          description: description?.trim() || undefined,
          is_shared: is_shared || false,
          alliance_id: allianceId,
        };

        const projectId = await createProject(result.user.id, input);
        return NextResponse.json({ id: projectId, success: true });
      }

      case "update": {
        if (!project_id) {
          return NextResponse.json(
            { error: "Project ID is required" },
            { status: 400 }
          );
        }

        const updateInput: UpdateProjectInput = {};
        if (data.name !== undefined) updateInput.name = data.name.trim();
        if (data.description !== undefined) updateInput.description = data.description?.trim();
        if (data.status !== undefined) updateInput.status = data.status;
        if (data.is_shared !== undefined) updateInput.is_shared = data.is_shared;

        const updated = await updateProject(project_id, result.user.id, updateInput);
        return NextResponse.json({ success: updated });
      }

      case "delete": {
        if (!project_id) {
          return NextResponse.json(
            { error: "Project ID is required" },
            { status: 400 }
          );
        }

        const deleted = await deleteProject(project_id, result.user.id);
        return NextResponse.json({ success: deleted });
      }

      case "add-item": {
        if (!project_id) {
          return NextResponse.json(
            { error: "Project ID is required" },
            { status: 400 }
          );
        }

        const { item_id, quantity, notes, priority } = data;

        if (!item_id || !quantity) {
          return NextResponse.json(
            { error: "Item ID and quantity are required" },
            { status: 400 }
          );
        }

        const itemInput: AddProjectItemInput = {
          item_id,
          quantity,
          notes: notes?.trim() || undefined,
          priority: priority || 0,
        };

        const itemId = await addProjectItem(project_id, result.user.id, itemInput);
        if (itemId === null) {
          return NextResponse.json(
            { error: "Failed to add item" },
            { status: 400 }
          );
        }

        return NextResponse.json({ id: itemId, success: true });
      }

      case "update-progress": {
        if (!project_id) {
          return NextResponse.json(
            { error: "Project ID is required" },
            { status: 400 }
          );
        }

        const { item_id, completed_quantity } = data;

        if (item_id === undefined || completed_quantity === undefined) {
          return NextResponse.json(
            { error: "Item ID and completed quantity are required" },
            { status: 400 }
          );
        }

        const updated = await updateProjectItemProgress(
          item_id,
          project_id,
          result.user.id,
          completed_quantity
        );

        return NextResponse.json({ success: updated });
      }

      case "remove-item": {
        if (!project_id) {
          return NextResponse.json(
            { error: "Project ID is required" },
            { status: 400 }
          );
        }

        const { item_id } = data;

        if (!item_id) {
          return NextResponse.json(
            { error: "Item ID is required" },
            { status: 400 }
          );
        }

        const removed = await removeProjectItem(item_id, project_id, result.user.id);
        return NextResponse.json({ success: removed });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request: " + String(error) },
      { status: 500 }
    );
  }
}
