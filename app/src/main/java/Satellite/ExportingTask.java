
package Satellite;

public class ExportingTask {

    static final short STATUS_PENDING           = 0;    // Task not yet started
    static final short STATUS_RUNNING           = 1;    // Task is running...
    static final short STATUS_ENDED_SUCCESS     = 2;    // Task ended with success
    static final short STATUS_ENDED_FAILED      = 3;    // Task failed to export

    private long    id                          = 0;
    private long    NumberOfPoints_Total        = 0;
    private long    NumberOfPoints_Processed    = 0;
    private short   Status                      = STATUS_PENDING;
    private String Name                        = "";


    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public long getNumberOfPoints_Total() {
        return NumberOfPoints_Total;
    }

    public void setNumberOfPoints_Total(long numberOfPoints_Total) {
        NumberOfPoints_Total = numberOfPoints_Total;
    }

    public long getNumberOfPoints_Processed() {
        return NumberOfPoints_Processed;
    }

    public void setNumberOfPoints_Processed(long numberOfPoints_Processed) {
        NumberOfPoints_Processed = numberOfPoints_Processed;
    }

    public short getStatus() {
        return Status;
    }

    public void setStatus(short status) {
        Status = status;
    }

    public String getName() {
        return Name;
    }

    public void setName(String name) {
        Name = name;
    }
}

