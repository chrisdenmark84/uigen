import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

const ANON_WORK = {
  messages: [{ role: "user", content: "hello" }],
  fileSystemData: { "/App.jsx": { type: "file", content: "<div/>" } },
};

const PROJECTS = [
  { id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() },
  { id: "proj-2", name: "Old Design", createdAt: new Date(), updatedAt: new Date() },
];

const CREATED_PROJECT = {
  id: "new-proj-1",
  name: "Design",
  userId: "user-1",
  messages: "[]",
  data: "{}",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true during sign-in and false after", async () => {
      let resolveSignIn!: (v: { success: boolean }) => void;
      mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(PROJECTS);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: true });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let returnValue: { success: boolean; error?: string } | undefined;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("calls signInAction with email and password", async () => {
      mockSignIn.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("does not call handlePostSignIn when sign-in fails", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during sign-up and false after", async () => {
      let resolveSignUp!: (v: { success: boolean }) => void;
      mockSignUp.mockReturnValue(new Promise((r) => (resolveSignUp = r)));
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(PROJECTS);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: true });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with email and password", async () => {
      mockSignUp.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "securepass");
      });

      expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "securepass");
    });

    test("returns the result from signUpAction", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      let returnValue: { success: boolean; error?: string } | undefined;

      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("does not call handlePostSignIn when sign-up fails", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn", () => {
    describe("with anonymous work", () => {
      test("creates a project from anon work and redirects to it", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(ANON_WORK);
        mockCreateProject.mockResolvedValue(CREATED_PROJECT);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design from /),
          messages: ANON_WORK.messages,
          data: ANON_WORK.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
      });

      test("does not call getProjects when anon work exists", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(ANON_WORK);
        mockCreateProject.mockResolvedValue(CREATED_PROJECT);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockGetProjects).not.toHaveBeenCalled();
      });

      test("clears anon work before redirecting", async () => {
        const callOrder: string[] = [];
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(ANON_WORK);
        mockCreateProject.mockResolvedValue(CREATED_PROJECT);
        mockClearAnonWork.mockImplementation(() => callOrder.push("clear"));
        mockPush.mockImplementation(() => callOrder.push("push"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(callOrder).toEqual(["clear", "push"]);
      });

      test("works the same for signUp with anon work", async () => {
        mockSignUp.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(ANON_WORK);
        mockCreateProject.mockResolvedValue(CREATED_PROJECT);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalled();
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
      });
    });

    describe("without anonymous work — existing projects", () => {
      test("redirects to the most recent project", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue(PROJECTS);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith(`/${PROJECTS[0].id}`);
      });

      test("does not create a project when existing ones exist", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue(PROJECTS);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
      });

      test("skips anon work when getAnonWorkData returns empty messages", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
        mockGetProjects.mockResolvedValue(PROJECTS);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith(`/${PROJECTS[0].id}`);
      });
    });

    describe("without anonymous work — no existing projects", () => {
      test("creates a new blank project and redirects to it", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue(CREATED_PROJECT);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
      });

      test("generates a numeric suffix in the new project name", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue(CREATED_PROJECT);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        const call = mockCreateProject.mock.calls[0][0];
        expect(call.name).toMatch(/^New Design #\d+$/);
      });
    });
  });
});
